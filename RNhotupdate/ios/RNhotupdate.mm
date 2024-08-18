#import "RNhotupdate.h"
#import <React/RCTLog.h>
#import <SSZipArchive/SSZipArchive.h>

@implementation RNhotupdate
RCT_EXPORT_MODULE()

// Example method
// See // https://reactnative.dev/docs/native-modules-ios
RCT_EXPORT_METHOD(multiply:(double)a
                  b:(double)b
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSNumber *result = @(a * b);

    resolve(result);
}

// Check if a file path is valid
- (BOOL)isFilePathValid:(NSString *)path {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    return [fileManager fileExistsAtPath:path];
}

- (BOOL)removeBundleIfNeeded {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *retrievedString = [defaults stringForKey:@"PATH"];
    if (retrievedString && [self isFilePathValid:retrievedString]) {
        BOOL isDeleted = [self deleteFileAtPath:retrievedString];
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

- (NSString *)unzipFileAtPath:(NSString *)zipFilePath {
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

    // Find the extracted file (assuming only one file in the zip)
    NSArray *contents = [fileManager contentsOfDirectoryAtPath:extractedFolderPath error:nil];
    if (contents.count == 1) {
        NSString *filePath = [extractedFolderPath stringByAppendingPathComponent:contents.firstObject];

        // Delete the zip file after extraction
        NSError *removeError = nil;
        [fileManager removeItemAtPath:zipFilePath error:&removeError];
        if (removeError) {
            NSLog(@"Failed to delete zip file: %@", removeError.localizedDescription);
        }

        // Return the exact file path
        return filePath;
    } else {
        [self deleteFileAtPath:zipFilePath];
        NSLog(@"Expected one file in the zip but found %lu", (unsigned long)contents.count);
        return nil;
    }
}

// Expose setupBundlePath method to JavaScript
RCT_EXPORT_METHOD(setupBundlePath:(NSString *)path withResolver:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject) {
    if ([self isFilePathValid:path]) {
        //Unzip file
        NSString *extractedFilePath = [self unzipFileAtPath:path];
        NSLog(@"file extraction----- %@", extractedFilePath);
        if (extractedFilePath) {
            [self removeBundleIfNeeded];
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

@end
