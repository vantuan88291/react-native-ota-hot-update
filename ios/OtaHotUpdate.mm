#import "OtaHotUpdate.h"
#import <SSZipArchive/SSZipArchive.h>
#include <signal.h>

@interface OtaHotUpdate ()
- (NSArray *)loadBundleHistory;
- (void)saveBundleHistory:(NSArray *)history;
- (void)saveBundleVersion:(NSString *)path version:(NSInteger)version maxVersions:(NSInteger)maxVersions metadata:(NSString *)metadata;
- (NSString *)extractFolderName:(NSString *)path;
@end

static NSUncaughtExceptionHandler *previousHandler = NULL;
static BOOL isBeginning = YES;
@implementation OtaHotUpdate
RCT_EXPORT_MODULE()


- (instancetype)init {
    self = [super init];
    if (self) {
        previousHandler = NSGetUncaughtExceptionHandler();
        NSSetUncaughtExceptionHandler(&OTAExceptionHandler);
        signal(SIGABRT, OTASignalHandler);
        signal(SIGILL, OTASignalHandler);
        signal(SIGSEGV, OTASignalHandler);
        signal(SIGFPE, OTASignalHandler);
        signal(SIGBUS, OTASignalHandler);
        signal(SIGPIPE, OTASignalHandler);
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            isBeginning = NO;
        });
    }
    return self;
}

void OTASignalHandler(int sig) {
    if (isBeginning) {
        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        NSString *oldPath = [defaults stringForKey:@"OLD_PATH"];
        if (oldPath) {
            BOOL isDeleted = [OtaHotUpdate removeBundleIfNeeded:@"PATH"];
            if (isDeleted) {
                [defaults setObject:oldPath forKey:@"PATH"];
            }
            [defaults removeObjectForKey:@"OLD_PATH"];
        } else {
            [defaults removeObjectForKey:@"PATH"];
        }
        [defaults synchronize];
    }

    signal(sig, SIG_DFL);
    raise(sig);
}
void OTAExceptionHandler(NSException *exception) {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    if (isBeginning) {
      NSString *oldPath = [defaults stringForKey:@"OLD_PATH"];
        if (oldPath) {
          BOOL isDeleted = [OtaHotUpdate removeBundleIfNeeded:@"PATH"];
          if (isDeleted) {
            [defaults setObject:oldPath forKey:@"PATH"];
            [defaults removeObjectForKey:@"OLD_PATH"];
          } else {
            [defaults removeObjectForKey:@"OLD_PATH"];
            [defaults removeObjectForKey:@"PATH"];
          }
        } else {
          [defaults removeObjectForKey:@"PATH"];
        }
      [defaults synchronize];
    } else if (previousHandler) {
        previousHandler(exception);
    }
}

// Check if a file path is valid
+ (BOOL)isFilePathValid:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    return [fileManager fileExistsAtPath:path];
}

// Delete a file at the specified path
- (BOOL)deleteFileAtPath:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSError *error = nil;
    BOOL success = [fileManager removeItemAtPath:path error:&error];
    if (!success) {
      NSLog(@"Error deleting file: %@", [error localizedDescription]);
    }
    return success;
}
+ (BOOL)deleteAllContentsOfParentDirectoryOfFile:(NSString *)filePath error:(NSError **)error {
    NSFileManager *fileManager = [NSFileManager defaultManager];

    // Get the parent directory of the file
    NSString *parentDirectory = [filePath stringByDeletingLastPathComponent];

    // Ensure the parent directory exists
    BOOL isDirectory;
    if (![fileManager fileExistsAtPath:parentDirectory isDirectory:&isDirectory] || !isDirectory) {
        if (error) {
            *error = [NSError errorWithDomain:NSCocoaErrorDomain code:NSFileReadNoSuchFileError userInfo:@{NSLocalizedDescriptionKey: @"Parent directory does not exist or is not a directory."}];
        }
        return NO;
    }

    // Get the contents of the parent directory
    NSArray *contents = [fileManager contentsOfDirectoryAtPath:parentDirectory error:error];
    if (error && *error) {
        return NO;
    }

    BOOL success = YES;
    for (NSString *fileName in contents) {
        NSString *filePathInDirectory = [parentDirectory stringByAppendingPathComponent:fileName];

        BOOL isDirectory;
        if ([fileManager fileExistsAtPath:filePathInDirectory isDirectory:&isDirectory]) {
            NSError *removeError = nil;
            if (isDirectory) {
                // Recursively delete directory contents
                if (![fileManager removeItemAtPath:filePathInDirectory error:&removeError]) {
                    NSLog(@"Failed to delete directory at path: %@", filePathInDirectory);
                    success = NO;
                }
            } else {
                // Delete file
                if (![fileManager removeItemAtPath:filePathInDirectory error:&removeError]) {
                    NSLog(@"Failed to delete file at path: %@", filePathInDirectory);
                    success = NO;
                }
            }
        }
    }

    return success;
}

+ (BOOL)deleteBundleAtPath:(NSString *)path {
    if (!path || path.length == 0) {
        return NO;
    }
    NSError *error = nil;
    if ([self isFilePathValid:path]) {
        BOOL isDeleted = [self deleteAllContentsOfParentDirectoryOfFile:path error:&error];
        return isDeleted;
    }
    return NO;
}

+ (BOOL)removeBundleIfNeeded:(NSString *)pathKey {
    NSString *keyToUse = pathKey ? pathKey : @"OLD_PATH";
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *retrievedString = [defaults stringForKey:keyToUse];
    NSError *error = nil;
  if (retrievedString && [self isFilePathValid:retrievedString]) {
        BOOL isDeleted = [self deleteAllContentsOfParentDirectoryOfFile:retrievedString error:&error];
        [defaults removeObjectForKey:keyToUse];
        [defaults synchronize];
        return isDeleted;
    } else {
        return NO;
    }
}

+ (BOOL)isFilePathExist:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    return [fileManager fileExistsAtPath:path];
}

+ (NSURL *)getBundle {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *retrievedString = [defaults stringForKey:@"PATH"];
    NSString *currentVersionName = [defaults stringForKey:@"VERSION_NAME"];
    NSString *versionName = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"];

  if (retrievedString && [self isFilePathExist:retrievedString] && [currentVersionName isEqualToString:versionName]) {
       NSURL *fileURL = [NSURL fileURLWithPath:retrievedString];
       return fileURL;
    } else {
         // reset version number because bundle is wrong version, need download from new version
        [defaults removeObjectForKey:@"VERSION"];
        [defaults removeObjectForKey:@"PATH"];
        [defaults synchronize];
        return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
    }
}

- (NSString *)searchForJsBundleInDirectory:(NSString *)directoryPath extension:(NSString *)extension {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSError *error;

    // Get contents of the directory
    NSArray *contents = [fileManager contentsOfDirectoryAtPath:directoryPath error:&error];
    if (error) {
        NSLog(@"Error reading directory contents: %@", error.localizedDescription);
        return nil;
    }

    for (NSString *file in contents) {
        NSString *filePath = [directoryPath stringByAppendingPathComponent:file];
        BOOL isDirectory;
        if ([fileManager fileExistsAtPath:filePath isDirectory:&isDirectory]) {
            if (isDirectory) {
                // Recursively search in subdirectories
                NSString *foundPath = [self searchForJsBundleInDirectory:filePath extension:extension];
                if (foundPath) {
                    return foundPath;
                }
            } else if ([filePath hasSuffix:extension]) {
                // Return the path if it's a .jsbundle file
                return filePath;
            }
        }
    }

    return nil;
}
- (NSString *)renameExtractedFolderInDirectory:(NSString *)directoryPath version:(NSNumber *)version {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSError *error = nil;

    // Get the contents of the extracted directory
    NSArray *contents = [fileManager contentsOfDirectoryAtPath:directoryPath error:&error];
    if (error || contents.count != 1) {
        NSLog(@"Error retrieving extracted folder or unexpected structure: %@", error.localizedDescription);
        return nil;
    }

    // Get the original extracted folder name (assuming only one folder exists)
    NSString *originalFolderName = contents.firstObject;
    NSString *originalFolderPath = [directoryPath stringByAppendingPathComponent:originalFolderName];

    // Generate new folder name with version and timestamp
    NSDateFormatter *dateFormatter = [[NSDateFormatter alloc] init];
    [dateFormatter setDateFormat:@"yyyy_MM_dd_HH_mm"];
    [dateFormatter setLocale:[NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"]];
    NSString *timestamp = [dateFormatter stringFromDate:[NSDate date]];
    NSString *folderName = version != nil 
        ? [NSString stringWithFormat:@"output_v%@_%@", version, timestamp]
        : [NSString stringWithFormat:@"output_%@", timestamp];
    NSString *newFolderPath = [directoryPath stringByAppendingPathComponent:folderName];

    // Rename the extracted folder
    if (![fileManager moveItemAtPath:originalFolderPath toPath:newFolderPath error:&error]) {
        NSLog(@"Failed to rename folder: %@", error.localizedDescription);
        return nil;
    }

    NSLog(@"Renamed extracted folder to: %@", newFolderPath);
    return newFolderPath;
}
- (NSString *)unzipFileAtPath:(NSString *)zipFilePath extension:(NSString *)extension version:(NSNumber *)version  {
    // Define the directory where the files will be extracted
    NSString *extractedFolderPath = [[zipFilePath stringByDeletingPathExtension] stringByAppendingPathExtension:@"unzip"];

    // Create the directory if it does not exist
    NSFileManager *fileManager = [NSFileManager defaultManager];
    if (![fileManager fileExistsAtPath:extractedFolderPath]) {
        NSError *error = nil;
        [fileManager createDirectoryAtPath:extractedFolderPath withIntermediateDirectories:YES attributes:nil error:&error];
        if (error) {
            [self deleteFileAtPath:zipFilePath];
            NSLog(@"Failed to create directory: %@", error.localizedDescription);
            return nil;
        }
    }

    // Unzip the file
    BOOL success = [SSZipArchive unzipFileAtPath:zipFilePath toDestination:extractedFolderPath];
    if (!success) {
        [self deleteFileAtPath:zipFilePath];
        NSLog(@"Failed to unzip file");
        return nil;
    }
  // Try renaming the extracted folder
      NSString *renamedFolderPath = [self renameExtractedFolderInDirectory:extractedFolderPath version:version];

      // If renaming fails, use the original extracted folder path
      NSString *finalFolderPath = renamedFolderPath ? renamedFolderPath : extractedFolderPath;

    // Find .jsbundle files in the extracted directory
    NSString *jsbundleFilePath = [self searchForJsBundleInDirectory:finalFolderPath extension:extension];

        // Delete the zip file after extraction
        NSError *removeError = nil;
        [fileManager removeItemAtPath:zipFilePath error:&removeError];
        if (removeError) {
            NSLog(@"Failed to delete zip file: %@", removeError.localizedDescription);
        }
        return jsbundleFilePath;
}

// Expose setupBundlePath method to JavaScript
RCT_EXPORT_METHOD(setupBundlePath:(NSString *)path extension:(NSString *)extension version:(NSNumber *)version maxVersions:(NSNumber *)maxVersions metadata:(NSString *)metadata
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    if ([OtaHotUpdate isFilePathValid:path]) {
        [OtaHotUpdate removeBundleIfNeeded:nil];
        //Unzip file
        NSString *extractedFilePath = [self unzipFileAtPath:path extension:(extension != nil) ? extension : @".jsbundle" version:version];
        if (extractedFilePath) {
            NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
            NSString *oldPath = [defaults stringForKey:@"PATH"];
            
            // If version is provided, save to history system
            if (version != nil) {
                // Default maxVersions to 2 if not provided (backward compatible)
                NSInteger defaultMaxVersions = 2;
                NSInteger maxVersionsToKeep = maxVersions != nil ? [maxVersions integerValue] : defaultMaxVersions;
                [self saveBundleVersion:extractedFilePath version:[version integerValue] maxVersions:maxVersionsToKeep metadata:metadata];
            } else {
                // No version (e.g., Git update) - just set path, no history
                [defaults setObject:extractedFilePath forKey:@"PATH"];
            }
            
            [defaults setObject:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"] forKey:@"VERSION_NAME"];
            [defaults synchronize];
            isBeginning = YES;
            resolve(@(YES));
        } else {
            reject(@"E_UNZIP_FAIL", @"Unzipping failed, zip file invalid", nil);
        }
    } else {
        reject(@"E_INVALID_PATH", @"Invalid or missing file path", nil);
    }
}
RCT_EXPORT_METHOD(deleteBundle:(double)i
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *currentPath = [defaults stringForKey:@"PATH"];
    
    // Delete current bundle from file system
    BOOL isDeleted = [OtaHotUpdate removeBundleIfNeeded:@"PATH"];
    
    // Remove current bundle from history if exists
    if (currentPath && currentPath.length > 0) {
        NSArray *history = [self loadBundleHistory];
        NSMutableArray *updatedHistory = [NSMutableArray array];
        for (NSDictionary *bundle in history) {
            if (![bundle[@"path"] isEqualToString:currentPath]) {
                [updatedHistory addObject:bundle];
            }
        }
        [self saveBundleHistory:updatedHistory];
    }
    
    // Clear paths and version
    [defaults removeObjectForKey:@"PATH"];
    [defaults setObject:@"0" forKey:@"VERSION"];
    [defaults synchronize];
    
    resolve(@(isDeleted));
}
// Expose deleteBundle method to JavaScript
RCT_EXPORT_METHOD(rollbackToPreviousBundle:(double)i
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  NSString *currentPath = [defaults stringForKey:@"PATH"];
  
  // Use history to find previous version
  NSArray *history = [self loadBundleHistory];
  if (history.count > 0 && currentPath && currentPath.length > 0) {
    // Find current bundle in history
    NSDictionary *currentBundle = nil;
    for (NSDictionary *bundle in history) {
      if ([bundle[@"path"] isEqualToString:currentPath]) {
        currentBundle = bundle;
        break;
      }
    }
    
    if (currentBundle) {
      // Find previous version (older than current, max version)
      NSDictionary *previousBundle = nil;
      NSInteger currentVersion = [currentBundle[@"version"] integerValue];
      for (NSDictionary *bundle in history) {
        NSInteger bundleVersion = [bundle[@"version"] integerValue];
        if (bundleVersion < currentVersion) {
          if (!previousBundle || [bundle[@"version"] integerValue] > [previousBundle[@"version"] integerValue]) {
            previousBundle = bundle;
          }
        }
      }
      
      if (previousBundle && [OtaHotUpdate isFilePathValid:previousBundle[@"path"]]) {
        // Rollback to previous bundle from history
        BOOL isDeleted = [OtaHotUpdate removeBundleIfNeeded:@"PATH"];
        if (isDeleted) {
          [defaults setObject:previousBundle[@"path"] forKey:@"PATH"];
          [defaults setObject:[NSString stringWithFormat:@"%@", previousBundle[@"version"]] forKey:@"VERSION"];
          [defaults synchronize];
          resolve(@(YES));
          return;
        }
      }
    }
  }
  
  resolve(@(NO));
}

RCT_EXPORT_METHOD(getCurrentVersion:(double)a
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  NSString *version = [defaults stringForKey:@"VERSION"];
     if (version) {
         resolve(version);
     } else {
         resolve(@"0");
     }
}

RCT_EXPORT_METHOD(setCurrentVersion:(NSString *)version
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    // No longer save PREVIOUS_VERSION, use history instead
    if (version) {
        [defaults setObject:version forKey:@"VERSION"];
        [defaults synchronize];
        resolve(@(YES));
    } else {
        resolve(@(NO));
    }
}

RCT_EXPORT_METHOD(setUpdateMetadata:(NSString *)metadataString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    if (metadataString) {
        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        [defaults setObject:metadataString forKey:@"METADATA"];
        [defaults synchronize];
        resolve(@(YES));
    } else {
        resolve(@(NO));
    }
}

RCT_EXPORT_METHOD(getUpdateMetadata:(double)a
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *metadata = [defaults stringForKey:@"METADATA"];

    if (metadata) {
        resolve(metadata);
    } else {
        resolve(nil);
    }
}

RCT_EXPORT_METHOD(setExactBundlePath:(NSString *)path
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  if ([OtaHotUpdate isFilePathValid:path]) {
        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        [defaults setObject:path forKey:@"PATH"];
        [defaults setObject:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"] forKey:@"VERSION_NAME"];
        [defaults synchronize];
        resolve(@(YES));
    } else {
        resolve(@(NO));
    }
}

- (void)loadBundle
{
    RCTTriggerReloadCommandListeners(@"react-native-ota-hot-update: Restart");
}
- (NSArray *)loadBundleHistory {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *historyJson = [defaults stringForKey:@"BUNDLE_HISTORY"];
    
    // If history exists, load it
    if (historyJson && historyJson.length > 0) {
        NSData *data = [historyJson dataUsingEncoding:NSUTF8StringEncoding];
        NSError *error = nil;
        NSArray *history = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
        if (!error && [history isKindOfClass:[NSArray class]]) {
            return history;
        }
    }
    
    // Migration: If history is empty but PATH exists, migrate from old system
    NSString *currentPath = [defaults stringForKey:@"PATH"];
    NSString *currentVersion = [defaults stringForKey:@"VERSION"];
    NSString *previousPath = [defaults stringForKey:@"OLD_PATH"];
    NSString *previousVersion = [defaults stringForKey:@"PREVIOUS_VERSION"];
    
    if (!currentPath || currentPath.length == 0) {
        return @[];
    }
    
    // Migrate current bundle
    NSMutableArray *migratedHistory = [NSMutableArray array];
    
    // Add current bundle if has version
    if (currentVersion && currentVersion.length > 0) {
        NSInteger version = [currentVersion integerValue];
        if (version > 0 && [OtaHotUpdate isFilePathValid:currentPath]) {
            NSFileManager *fileManager = [NSFileManager defaultManager];
            NSDictionary *attributes = [fileManager attributesOfItemAtPath:currentPath error:nil];
            NSDate *modificationDate = attributes[NSFileModificationDate];
            long long timestamp = modificationDate ? (long long)([modificationDate timeIntervalSince1970] * 1000) : (long long)([[NSDate date] timeIntervalSince1970] * 1000);
            
            NSMutableDictionary *bundle = [NSMutableDictionary dictionary];
            bundle[@"version"] = @(version);
            bundle[@"path"] = currentPath;
            bundle[@"timestamp"] = @(timestamp);
            bundle[@"metadata"] = [NSNull null];
            [migratedHistory addObject:bundle];
        }
    }
    
    // Add previous bundle if exists
    if (previousPath && previousPath.length > 0 && previousVersion && previousVersion.length > 0) {
        NSInteger version = [previousVersion integerValue];
        if (version > 0 && [OtaHotUpdate isFilePathValid:previousPath]) {
            NSFileManager *fileManager = [NSFileManager defaultManager];
            NSDictionary *attributes = [fileManager attributesOfItemAtPath:previousPath error:nil];
            NSDate *modificationDate = attributes[NSFileModificationDate];
            long long timestamp = modificationDate ? (long long)([modificationDate timeIntervalSince1970] * 1000) : (long long)([[NSDate date] timeIntervalSince1970] * 1000);
            
            NSMutableDictionary *bundle = [NSMutableDictionary dictionary];
            bundle[@"version"] = @(version);
            bundle[@"path"] = previousPath;
            bundle[@"timestamp"] = @(timestamp);
            bundle[@"metadata"] = [NSNull null];
            [migratedHistory addObject:bundle];
        }
    }
    
    // Save migrated history if any
    if (migratedHistory.count > 0) {
        // Sort by version descending
        NSArray *sortedHistory = [migratedHistory sortedArrayUsingComparator:^NSComparisonResult(NSDictionary *obj1, NSDictionary *obj2) {
            NSInteger v1 = [obj1[@"version"] integerValue];
            NSInteger v2 = [obj2[@"version"] integerValue];
            if (v1 > v2) return NSOrderedAscending;
            if (v1 < v2) return NSOrderedDescending;
            return NSOrderedSame;
        }];
        [self saveBundleHistory:sortedHistory];
        return sortedHistory;
    }
    
    return @[];
}

- (void)saveBundleHistory:(NSArray *)history {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSError *error = nil;
    NSData *data = [NSJSONSerialization dataWithJSONObject:history options:0 error:&error];
    if (!error && data) {
        NSString *historyJson = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        [defaults setObject:historyJson forKey:@"BUNDLE_HISTORY"];
        [defaults synchronize];
    }
}

- (NSString *)extractFolderName:(NSString *)path {
    return [[path stringByDeletingLastPathComponent] lastPathComponent];
}

- (void)saveBundleVersion:(NSString *)path version:(NSInteger)version maxVersions:(NSInteger)maxVersions metadata:(NSString *)metadata {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSArray *history = [self loadBundleHistory];
    
    // Create new bundle entry
    NSMutableDictionary *newBundle = [NSMutableDictionary dictionary];
    newBundle[@"version"] = @(version);
    newBundle[@"path"] = path;
    newBundle[@"timestamp"] = @((long long)([[NSDate date] timeIntervalSince1970] * 1000));
    if (metadata) {
        newBundle[@"metadata"] = metadata;
    }
    
    // Combine with existing history
    NSMutableArray *updatedHistory = [NSMutableArray arrayWithObject:newBundle];
    [updatedHistory addObjectsFromArray:history];
    
    // Sort by version descending and remove duplicates
    [updatedHistory sortUsingComparator:^NSComparisonResult(NSDictionary *obj1, NSDictionary *obj2) {
        NSInteger v1 = [obj1[@"version"] integerValue];
        NSInteger v2 = [obj2[@"version"] integerValue];
        if (v1 > v2) return NSOrderedAscending;
        if (v1 < v2) return NSOrderedDescending;
        return NSOrderedSame;
    }];
    
    // Remove duplicates by version
    NSMutableArray *uniqueHistory = [NSMutableArray array];
    NSMutableSet *seenVersions = [NSMutableSet set];
    for (NSDictionary *bundle in updatedHistory) {
        NSInteger v = [bundle[@"version"] integerValue];
        if (![seenVersions containsObject:@(v)]) {
            [seenVersions addObject:@(v)];
            [uniqueHistory addObject:bundle];
        }
    }
    
    // Keep only maxVersions most recent
    NSArray *finalHistory = [uniqueHistory subarrayWithRange:NSMakeRange(0, MIN(maxVersions, uniqueHistory.count))];
    
    // Delete old versions beyond limit
    NSMutableSet *versionsToKeep = [NSMutableSet set];
    for (NSDictionary *bundle in finalHistory) {
        [versionsToKeep addObject:bundle[@"version"]];
    }
    
    for (NSDictionary *bundle in uniqueHistory) {
        if (![versionsToKeep containsObject:bundle[@"version"]]) {
            [OtaHotUpdate deleteBundleAtPath:bundle[@"path"]];
        }
    }
    
    // Save updated history
    [self saveBundleHistory:finalHistory];
    
    // Set current path and version
    [defaults setObject:path forKey:@"PATH"];
    [defaults setObject:[NSString stringWithFormat:@"%ld", (long)version] forKey:@"VERSION"];
    [defaults synchronize];
}

RCT_EXPORT_METHOD(restart) {
    if ([NSThread isMainThread]) {
        [self loadBundle];
    } else {
        dispatch_sync(dispatch_get_main_queue(), ^{
            [self loadBundle];
        });
    }
    return;
}


RCT_EXPORT_METHOD(getBundleList:(double)a
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSArray *history = [self loadBundleHistory];
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *activePath = [defaults stringForKey:@"PATH"];
    
    NSMutableArray *bundleList = [NSMutableArray array];
    for (NSDictionary *bundle in history) {
        NSString *path = bundle[@"path"];
        NSString *folderName = [self extractFolderName:path];
        NSMutableDictionary *bundleInfo = [NSMutableDictionary dictionary];
        bundleInfo[@"id"] = folderName;
        bundleInfo[@"version"] = bundle[@"version"];
        bundleInfo[@"date"] = bundle[@"timestamp"];
        bundleInfo[@"path"] = path;
        bundleInfo[@"isActive"] = @([path isEqualToString:activePath]);
        if (bundle[@"metadata"]) {
            NSError *error = nil;
            id metadata = [NSJSONSerialization JSONObjectWithData:[bundle[@"metadata"] dataUsingEncoding:NSUTF8StringEncoding] options:0 error:&error];
            bundleInfo[@"metadata"] = error ? bundle[@"metadata"] : metadata;
        } else {
            bundleInfo[@"metadata"] = [NSNull null];
        }
        [bundleList addObject:bundleInfo];
    }
    
    NSError *error = nil;
    NSData *data = [NSJSONSerialization dataWithJSONObject:bundleList options:0 error:&error];
    if (!error && data) {
        NSString *jsonString = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        resolve(jsonString);
    } else {
        reject(@"GET_BUNDLE_LIST_ERROR", @"Failed to serialize bundle list", error);
    }
}

RCT_EXPORT_METHOD(deleteBundleById:(NSString *)id
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSArray *history = [self loadBundleHistory];
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *activePath = [defaults stringForKey:@"PATH"];
    
    NSDictionary *bundleToDelete = nil;
    for (NSDictionary *bundle in history) {
        NSString *folderName = [self extractFolderName:bundle[@"path"]];
        if ([folderName isEqualToString:id]) {
            bundleToDelete = bundle;
            break;
        }
    }
    
    if (!bundleToDelete) {
        resolve(@(NO));
        return;
    }
    
    // If deleting active bundle, rollback to oldest remaining bundle or clear
    if ([bundleToDelete[@"path"] isEqualToString:activePath]) {
        NSMutableArray *remainingBundles = [NSMutableArray array];
        for (NSDictionary *bundle in history) {
            if (![bundle[@"path"] isEqualToString:bundleToDelete[@"path"]]) {
                [remainingBundles addObject:bundle];
            }
        }
        if (remainingBundles.count > 0) {
            NSDictionary *oldestBundle = [remainingBundles sortedArrayUsingComparator:^NSComparisonResult(NSDictionary *obj1, NSDictionary *obj2) {
                NSInteger v1 = [obj1[@"version"] integerValue];
                NSInteger v2 = [obj2[@"version"] integerValue];
                if (v1 < v2) return NSOrderedAscending;
                if (v1 > v2) return NSOrderedDescending;
                return NSOrderedSame;
            }].firstObject;
            [defaults setObject:oldestBundle[@"path"] forKey:@"PATH"];
            [defaults setObject:[NSString stringWithFormat:@"%@", oldestBundle[@"version"]] forKey:@"VERSION"];
        } else {
            [defaults removeObjectForKey:@"PATH"];
            [defaults removeObjectForKey:@"VERSION"];
        }
        [defaults synchronize];
    }
    
    // Delete bundle folder
    BOOL isDeleted = [OtaHotUpdate deleteBundleAtPath:bundleToDelete[@"path"]];
    
    // Remove from history
    NSMutableArray *updatedHistory = [NSMutableArray array];
    for (NSDictionary *bundle in history) {
        if (![bundle[@"path"] isEqualToString:bundleToDelete[@"path"]]) {
            [updatedHistory addObject:bundle];
        }
    }
    [self saveBundleHistory:updatedHistory];
    
    resolve(@(isDeleted));
}

RCT_EXPORT_METHOD(clearAllBundles:(double)a
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSArray *history = [self loadBundleHistory];
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    
    // Delete all bundle folders
    for (NSDictionary *bundle in history) {
        [OtaHotUpdate deleteBundleAtPath:bundle[@"path"]];
    }
    
    // Clear history
    [self saveBundleHistory:@[]];
    
    // Clear current path and version
    [defaults removeObjectForKey:@"PATH"];
    [defaults removeObjectForKey:@"VERSION"];
    [defaults synchronize];
    
    resolve(@(YES));
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeOtaHotUpdateSpecJSI>(params);
}
#endif

@end
