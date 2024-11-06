#!/bin/bash
yarn export-android
sh ./release.sh -p "android" -f "./android/index.android.bundle.zip" -t "$STRAPI_TOKEN" -l "domain.com" -n "release from bash android bundle"

yarn export-ios
sh ./release.sh -p "ios" -f "./ios/main.jsbundle.zip" -t "$STRAPI_TOKEN" -l "domain.com" -n "release from bash ios bundle"
