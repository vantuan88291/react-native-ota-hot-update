@objc(OtaHotUpdate)
class OtaHotUpdate: NSObject {

    func isFilePathValid(_ path: String) -> Bool {
        let fileManager = FileManager.default
        return fileManager.fileExists(atPath: path)
    }
    func deleteFile(at path: String)  -> Bool {
        let fileManager = FileManager.default
        do {
            try fileManager.removeItem(atPath: path)
            return true
        } catch let error as NSError {
            print("Error deleting file: \(error.localizedDescription)")
            return false
        }
    }
  @objc(multiply:withB:withResolver:withRejecter:)
  func multiply(a: Float, b: Float, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
    resolve(a*b)
  }


    @objc(setupBundlePath:withResolver:withRejecter:)
    func setupBundlePath(_ path: String, resolve: @escaping RCTPromiseResolveBlock,reject: RCTPromiseRejectBlock) -> Void {
        if isFilePathValid(path) {
            let defaults = UserDefaults.standard
            defaults.set(path, forKey: "PATH")
            resolve(true)
        } else {
            resolve(false)
        }

    }

    @objc(deleteBundle:withRejecter:)
    func setupBundlePath(resolve: @escaping RCTPromiseResolveBlock,reject: RCTPromiseRejectBlock) -> Void {
        let defaults = UserDefaults.standard
        if let retrievedString = defaults.string(forKey: "PATH") {
            if isFilePathValid(retrievedString) {
                let isDeleted = deleteFile(at: retrievedString)
                UserDefaults.standard.removeObject(forKey: "PATH")
                resolve(isDeleted)
            } else {
                resolve(false)
            }
        } else {
            resolve(false)
        }
    }
}
