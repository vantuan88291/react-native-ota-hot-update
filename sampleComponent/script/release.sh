#!/bin/bash

# A script to upload a bundle for either iOS or Android with specified version, file, note, and Bearer token.

# Function to display the usage of the script
usage() {
  echo "Usage: $0 -p <platform> -v <version> -file <file> -t <bearer_token> [-n <note>]"
  echo "  -p     Platform ('ios' or 'android')"
  echo "  -f  Path to the bundle file (e.g., '/path/to/bundle.zip')"
  echo "  -t     Bearer Token for Authorization"
  echo "  -l     Link of api"
  echo "  -n     (Optional) Note to attach to the release"
  exit 1
}

# Check if enough arguments are passed
if [ $# -lt 8 ]; then
  usage
fi
# Parse command-line arguments
while getopts "p:f:t:l:n:" opt; do
  case ${opt} in
    p) platform="$OPTARG" ;;  # Platform (ios or android)
    f) file="$OPTARG" ;;    # Path to the bundle file
    t) token="$OPTARG" ;;      # Bearer Token for Authorization
    l) link="$OPTARG" ;;      # api link
    n) note="$OPTARG" ;;       # Optional note (defaults to empty if not set)
    *) usage ;;                # Invalid option
  esac
done

# Check if platform is valid (either ios or android)
if [ "$platform" != "ios" ] && [ "$platform" != "android" ]; then
  echo "Error: Invalid platform. Use 'ios' or 'android'."
  usage
fi

# Check if version is provided
version="1.0.0"


# Check if the file path is provided and the file exists
if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "Error: File (-file) is required and must exist."
  usage
fi

# Check if Bearer token is provided
if [ -z "$token" ]; then
  echo "Error: Bearer token (-t) is required."
  usage
fi
# Check if link api is provided
if [ -z "$link" ]; then
  echo "Error: link (-l) is required."
  usage
fi


# Set the correct API endpoint based on the platform
if [ "$platform" = "ios" ]; then
  url="https://$link/api/ios-bundles"
else
  url="https://$link/api/android-bundles"
fi

echo "Start publish with $url"
# If no note is provided, set it as an empty string
note=${note:-""}

# Construct the data payload for the API
data="{\"note\": \"$note\", \"targetVersion\": $version, \"status\": true, \"required\": true}"

# Make the curl request to upload the bundle
curl --location "$url" \
  --header "Authorization: Bearer $token" \
  --form "data=$data" \
  --form "files.bundle=@\"$file\""

# End of script
