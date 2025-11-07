"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withAndroidAction = (config) => {
    return (0, config_plugins_1.withMainApplication)(config, (config) => {
        let content = config.modResults.contents;
        const isNewReactHost = content.includes('context = applicationContext');
        if (!content.includes('import com.otahotupdate.OtaHotUpdate')) {
            content = content.replace(/import android.app.Application/g, `
import android.app.Application
import com.otahotupdate.OtaHotUpdate`);
        }
        if (isNewReactHost) {
            if (!content.includes('OtaHotUpdate.bundleJS')) {
                content = content.replace(/context = applicationContext,/, `context = applicationContext,
      jsBundleFilePath = OtaHotUpdate.bundleJS(applicationContext),
      `);
            }
            config.modResults.contents = content;
            return config;
        }
        if (!content.includes('OtaHotUpdate.bundleJS(this@MainApplication)')) {
            content = content.replace(/DefaultReactNativeHost\s*\(this\)\s*\{/, `
          DefaultReactNativeHost(this) {

          override fun getJSBundleFile(): String = OtaHotUpdate.bundleJS(this@MainApplication)`);
        }
        config.modResults.contents = content;
        return config;
    });
};
const withIosAction = (config) => {
    return (0, config_plugins_1.withAppDelegate)(config, (config) => {
        const appDelegatePath = config.modRequest.projectRoot + '/ios/' + config_plugins_1.IOSConfig.Paths.getAppDelegateFilePath(config.modRequest.projectRoot);
        const isSwift = appDelegatePath.endsWith('.swift');
        if (isSwift) {
            // Swift: AppDelegate.swift
            if (!config.modResults.contents.includes('import react_native_ota_hot_update')) {
                config.modResults.contents = `import react_native_ota_hot_update\n${config.modResults.contents}`;
            }
            if (!config.modResults.contents.includes('OtaHotUpdate.getBundle()')) {
                config.modResults.contents = config.modResults.contents.replace(/return Bundle.main.url\(forResource: "main", withExtension: "jsbundle"\)/, `return OtaHotUpdate.getBundle()`);
            }
        }
        else {
            // Objective-C: AppDelegate.mm
            if (!config.modResults.contents.includes('#import "OtaHotUpdate.h')) {
                config.modResults.contents = config.modResults.contents.replace(/#import "AppDelegate.h"/g, `#import "AppDelegate.h"
#import "OtaHotUpdate.h"`);
            }
            config.modResults.contents = config.modResults.contents.replace(/\[\[NSBundle mainBundle\] URLForResource:@\"main\" withExtension:@\"jsbundle\"\]/, `[OtaHotUpdate getBundle]`);
        }
        return config;
    });
};
const withAction = (config) => {
    config = withAndroidAction(config);
    config = withIosAction(config);
    return config;
};
module.exports = withAction;
