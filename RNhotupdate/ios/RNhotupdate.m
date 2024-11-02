#import "RNhotupdate.h"
#import <React/RCTLog.h>
#import <SSZipArchive/SSZipArchive.h>

@implementation RNhotupdate
RCT_EXPORT_MODULE()

// Check if a file path is valid
- (BOOL)isFilePathValid:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    return [fileManager fileExistsAtPath:path];
}

- (BOOL)removeBundleIfNeeded {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *retrievedString = [defaults stringForKey:@"PATH"];
    NSError *error = nil;
    if (retrievedString && [self isFilePathValid:retrievedString]) {
        BOOL isDeleted = [self deleteAllContentsOfParentDirectoryOfFile:retrievedString error:&error];
        [defaults removeObjectForKey:@"PATH"];
        [defaults synchronize];
        return isDeleted;
    } else {
        return NO;
    }
}

// Delete a file at the specified path
- (BOOL)deleteFileAtPath:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSError *error = nil;
    BOOL success = [fileManager removeItemAtPath:path error:&error];
    if (!success) {
        RCTLogError(@"Error deleting file: %@", [error localizedDescription]);
    }
    return success;
}

- (BOOL)deleteAllContentsOfParentDirectoryOfFile:(NSString *)filePath error:(NSError **)error {
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
+ (BOOL)isFilePathExist:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    return [fileManager fileExistsAtPath:path];
}

+ (NSURL *)getBundle {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *retrievedString = [defaults stringForKey:@"PATH"];
    if (retrievedString && [self isFilePathExist:retrievedString]) {
       NSURL *fileURL = [NSURL fileURLWithPath:retrievedString];
       return fileURL;
    } else {
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
- (NSString *)unzipFileAtPath:(NSString *)zipFilePath extension:(NSString *)extension  {
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
    // Find .jsbundle files in the extracted directory
    NSString *jsbundleFilePath = [self searchForJsBundleInDirectory:extractedFolderPath extension:extension];

        // Delete the zip file after extraction
        NSError *removeError = nil;
        [fileManager removeItemAtPath:zipFilePath error:&removeError];
        if (removeError) {
            NSLog(@"Failed to delete zip file: %@", removeError.localizedDescription);
        }
        NSLog(@"File path----: %@", jsbundleFilePath);
        // Return the .jsbundle file path or nil if not found
        return jsbundleFilePath;
}

// Expose setupBundlePath method to JavaScript
RCT_EXPORT_METHOD(setupBundlePath:(NSString *)path extension:(NSString *)extension withResolver:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject) {
    if ([self isFilePathValid:path]) {
        [self removeBundleIfNeeded];
        //Unzip file
        NSString *extractedFilePath = [self unzipFileAtPath:path extension:(extension != nil) ? extension : @".jsbundle"];
        NSLog(@"file extraction----- %@", extractedFilePath);
        if (extractedFilePath) {
            NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
            [defaults setObject:extractedFilePath forKey:@"PATH"];
            [defaults synchronize];
            resolve(@(YES));
        } else {
            resolve(@(NO));
        }
    } else {
        resolve(@(NO));
    }
}

// Expose deleteBundle method to JavaScript
RCT_EXPORT_METHOD(deleteBundle:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject) {
    BOOL isDeleted = [self removeBundleIfNeeded];
    resolve(@(isDeleted));
}

RCT_EXPORT_METHOD(getCurrentVersion:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject) {
     NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
     NSString *version = [defaults stringForKey:@"VERSION"];
        if (version) {
            resolve(version);
        } else {
            resolve(@("0"));
        }
}

RCT_EXPORT_METHOD(setCurrentVersion:(NSString *)version withResolver:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject) {
    if (version) {
        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        [defaults setObject:version forKey:@"VERSION"];
        [defaults synchronize];
        resolve(@(YES));
    } else {
        resolve(@(NO));
    }
}

- (void)loadBundle
{
    RCTTriggerReloadCommandListeners(@"rn-hotupdate: Restart");
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

@end
