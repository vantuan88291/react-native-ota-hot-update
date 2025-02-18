import { withMainApplication, withAppDelegate } from '@expo/config-plugins';
const withAndroidAction: any = (config: any) => {
  return withMainApplication(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED/g,
      `
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED

          override fun getJSBundleFile(): String = OtaHotUpdate.bundleJS`
    );
    config.modResults.contents = config.modResults.contents.replace(
      /import expo.modules.ReactNativeHostWrapper/g,
      `
import expo.modules.ReactNativeHostWrapper
import com.otahotupdate.OtaHotUpdate`
    );
    return config;
  });
};

const withIosAction: any = (config: any) => {
  return withAppDelegate(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /#import "AppDelegate.h"/g,
      `#import "AppDelegate.h"
#import "OtaHotUpdate.h"`
    );
    config.modResults.contents = config.modResults.contents.replace(
      /\[\[NSBundle mainBundle\] URLForResource:@\"main\" withExtension:@\"jsbundle\"\]/,
      `[OtaHotUpdate getBundle]`
    );
    return config;
  });
};

const withAction: any = (config: any) => {
  config = withAndroidAction(config);
  config = withIosAction(config);
  return config;
};
module.exports = withAction;
