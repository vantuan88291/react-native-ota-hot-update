"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withAndroidAction = (config) => {
    return (0, config_plugins_1.withMainApplication)(config, (config) => {
        if (!config.modResults.contents.includes('override fun getJSBundleFile(): String = OtaHotUpdate.bundleJS(this@MainApplication)')) {
            config.modResults.contents = config.modResults.contents.replace(/override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED/g, `
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED

          override fun getJSBundleFile(): String = OtaHotUpdate.bundleJS(this@MainApplication)`);
        }
        if (!config.modResults.contents.includes('import com.otahotupdate.OtaHotUpdate')) {
            config.modResults.contents = config.modResults.contents.replace(/import expo.modules.ReactNativeHostWrapper/g, `
import expo.modules.ReactNativeHostWrapper
import com.otahotupdate.OtaHotUpdate`);
        }
        return config;
    });
};
const withIosAction = (config) => {
    return (0, config_plugins_1.withAppDelegate)(config, (config) => {
        if (!config.modResults.contents.includes('#import "OtaHotUpdate.h')) {
            config.modResults.contents = config.modResults.contents.replace(/#import "AppDelegate.h"/g, `#import "AppDelegate.h"
#import "OtaHotUpdate.h"`);
        }
        config.modResults.contents = config.modResults.contents.replace(/\[\[NSBundle mainBundle\] URLForResource:@\"main\" withExtension:@\"jsbundle\"\]/, `[OtaHotUpdate getBundle]`);
        return config;
    });
};
const withAction = (config) => {
    config = withAndroidAction(config);
    config = withIosAction(config);
    return config;
};
module.exports = withAction;
