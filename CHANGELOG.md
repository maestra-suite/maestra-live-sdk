# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2] - 2025-09-12
### Added
- **Voice Over Feature**: voiceId parameter added instead of voiceOverEnabled.

## [0.1.1] - 2025-09-05
### Added
- **Voice Over Feature**: Added voice over feature for development of web applications.

## [0.1.0] - 2025-08-08
### Republished as a new package
- **Maestra Live SDK**: Name changed


## [0.6.2] - 2025-01-06
### Added
- **vMix Integration Documentation**: Added comprehensive vMix integration example to README
  - Complete working example showing how to integrate vMix with Maestra SDK
  - VmixProcessor configuration with interim and translation options
  - Event handling for real-time caption delivery to vMix
  - Error handling and graceful shutdown procedures
  - Configuration notes for vMix Web Controller setup

### Improved
- **README Documentation**: Enhanced stream examples section with vMix live production integration
- **Integration Examples**: Added production-ready vMix caption integration workflow

## [0.6.1] - 2025-08-04
### Fixed
- **HLS VOD Stream Error**: VOD streams were not available to be processed by ffmpeg because of wrong options. 
- **Demo Translation Scrollable**: On UI, Translation bar used to be hardcoded block now it is flex.  


## [0.6.0] - 2025-01-22

### Added
- **API Key Validation**: Added pre-connection validation to detect missing or empty API keys before attempting connection
- **Enhanced Error Handling**: Improved authentication error detection with specific error messages for API key issues
- **Connection Timeout**: Added configurable timeout handling for server responses to detect authentication failures
- **Authentication Error Detection**: Automatic detection of server-side authentication errors with meaningful user feedback
- **API Key Validation Demo**: Added example script demonstrating various API key validation scenarios

### Improved  
- **Error Messages**: More descriptive error messages that clearly indicate API key authentication issues
- **User Experience**: Users now get immediate feedback for API key problems instead of generic connection errors
- **Debugging**: Better error categorization helps developers quickly identify authentication vs. network issues

### Technical Details
- Added `_validateApiKey()` method for client-side API key format validation
- Added `_isAuthenticationError()` method to detect server authentication failures
- Added `connectionTimeout` option (default: 10 seconds) for timeout handling
- Enhanced WebSocket error handling to differentiate authentication errors from other connection issues
- Added proper timeout cleanup to prevent memory leaks

## [0.5.5] - 2025-01-22

### Fixed
- **Critical interim filtering bug**: Fixed interim message accumulation that was causing "Cannot read properties of undefined (reading 'map')" errors
- **Memory leak prevention**: Interim segments no longer accumulate in memory, preventing stale data and performance issues
- **Data consistency**: Interim segments now only contain current message data, not accumulated historical data

### Improved
- **Cleaner interim handling**: Simplified filtering logic to process only current segments without persistent state

## [0.5.4] - 2025-01-22

### Improved
- **Complete working example**: Updated main README example to show a complete, functional transcription + translation setup
- **Real-world configuration**: Main example now includes all new parameters (`saveToDashboard: true`, `translationEnabled: true`)
- **Production-ready code**: All examples now include proper event handlers for both transcription and translation
- **Copy-paste ready**: Users can now copy the main example and run it immediately without modifications

## [0.5.3] - 2025-01-22

### Added
- **Best practices documentation**: Added comprehensive error handling examples to prevent common crashes
- **Translation event handlers**: Added complete examples for handling both transcription and translation events
- **Null safety**: Added proper null checks in all README examples to prevent "Cannot read properties of undefined" errors

### Improved
- **Example code quality**: All code examples now include proper error handling and validation

## [0.5.2] - 2025-01-22

### Fixed
- **Documentation bug**: Removed immediate `maestraClient.stop()` call from README examples that was causing WebSocket connection failures
- **Example clarity**: Added proper guidance on how to stop transcription with timeout example

## [0.5.1] - 2025-01-22

### Added
- **Interim message filtering**: Added filter for interim messages to improve message processing

## [0.5.0] - 2025-01-22

### Added
- **New `saveToDashboard` parameter**: Save transcription sessions to Maestra dashboard
- **New `translationEnabled` parameter**: Explicit control over translation pipeline
- **Enhanced web demo**: Added UI controls for new parameters with helpful tooltips

### Fixed
- **Critical bug**: `translationEnabled` parameter was not being passed from MaestraClient to WebSocketClient
- **Boolean parameter handling**: Improved handling of explicit `false` values in SDK
- **CLI UX improvement**: Made `translationEnabled` optional with default `false` instead of required

### Changed
- **Updated documentation**: All README files updated with new parameters and cleaner examples
- **CLI examples**: Removed unnecessary `--translationEnabled false` from all examples
- **Parameter validation**: More robust boolean parameter handling throughout SDK

## [0.4.3] - 2025-01-11

### Changed
- **README Documentation**: Streamlined demo section to focus on essential information
  - Reduced demo documentation from 200+ lines to ~20 lines
  - Focused on "What You Can Use It For" and "How to Run the Demo"
  - Simplified code examples to be more concise
  - Repositioned demo as a helpful tool rather than main focus

## [0.4.2] - 2025-01-11

### Changed
- **Package Size Optimization**: Reduced npm package size by 80% (from 1.3 MB to 254.6 kB)
  - Excluded unnecessary font files from docs folder (~700KB reduction)
  - Removed demo and examples documentation from npm package
  - Optimized package.json files list to include only essential SDK documentation
  - Reduced total files from 73 to 51 while maintaining all core functionality

### Removed
- **Font Files**: Excluded docs/fonts/ folder containing large OpenSans font files
- **Demo Documentation**: Excluded demo_*.html files from npm package
- **Examples Documentation**: Excluded examples_*.html files from npm package

## [0.4.1] - 2025-01-11

### Fixed
- **Documentation References**: Removed all GitHub repository links and external references
- **Authentication Documentation**: Completed migration from Firebase token to API key references throughout all documentation
- **Demo Documentation**: Updated demo README to use API key authentication consistently
- **Self-contained Documentation**: Ensured all documentation is completely self-contained without external dependencies

### Changed
- **Package Documentation**: Enhanced README with comprehensive demo architecture documentation
- **Professional Presentation**: Improved documentation structure for production-ready distribution

## [0.4.0] - 2025-01-11

### Added
- **Comprehensive Demo Documentation**: Added extensive documentation for the web demo application
  - Detailed frontend architecture documentation including HTML structure, JavaScript engine, and CSS styling
  - Complete backend server documentation with Express.js, WebSocket, and SDK integration details
  - Comprehensive UI component documentation with header, setup panel, and transcription display
  - Technical implementation details for audio processing, real-time communication, and state management
  - Interactive controls documentation with button states, touch-friendly design, and accessibility features

### Changed
- **Package Structure**: Cleaned npm package to include only essential SDK files
  - Removed `demo/` and `examples/` folders from npm package (available separately from Maestra)
  - Added `.npmignore` file to ensure clean package distribution
  - Updated `package.json` files list to include only core SDK, docs, README, LICENSE, and CHANGELOG
  - Removed demo and CLI-related dependencies from package.json
- **Authentication References**: Updated all authentication references from Firebase tokens to API keys
  - Changed `idToken` parameter to `apiKey` throughout documentation
  - Updated all code examples to use API key authentication
  - Fixed API documentation to reflect API key usage instead of Firebase tokens
- **External Dependencies**: Removed all GitHub repository references and links
  - Updated README to reference Maestra downloads instead of GitHub links
  - Changed demo and examples availability to Maestra distribution
  - Removed external repository dependencies from documentation
- **Documentation Structure**: Enhanced README with production-ready professional documentation
  - Added "What's Included" section clearly separating npm package from external downloads
  - Enhanced demo architecture section with detailed technical specifications
  - Added comprehensive UI component documentation with visual and functional details
  - Updated CLI examples to use proper API key authentication

### Fixed
- **Package Distribution**: Ensured npm package contains only essential SDK files for optimal installation
- **Documentation Consistency**: Aligned all documentation with API key authentication model
- **Reference Accuracy**: Removed all external links and dependencies for self-contained documentation

### Removed
- **External References**: Removed GitHub repository links and references
- **Demo/Examples from NPM**: Excluded demo and examples from npm package distribution
- **Firebase Token References**: Completely replaced with API key authentication model

## [0.3.2] - 2024-12-20

### Changed
- **Default Configuration**: Changed default host/port to `localhost:5901` for local development
- **Documentation**: Updated all README files to use local development settings as default
- **Examples**: Simplified local development examples by using default settings

### Fixed
- **Development Experience**: Improved out-of-the-box experience for local development setup

## [0.3.1] - 2024-12-20

### Added
- **Enhanced Web Demo**: Added comprehensive language selection interface
  - Source language dropdown with auto-detect option and 15 supported languages
  - Target language dropdown that appears when translation is enabled
  - Responsive design with proper language controls styling
  - Real-time language parameter updates to server
- **Improved Language Documentation**: Enhanced README and examples with comprehensive language configuration guides
- **CLI Short Options**: Added `--sl` (source language) and `--tl` (target language) shortcuts for faster CLI usage
- **Language Support Reference**: Added comprehensive language codes reference in documentation

### Changed
- **Demo Interface**: Redesigned language selection UI for better user experience
- **Documentation**: Updated all README files with new language features and examples
- **Examples**: Enhanced CLI examples with more language configuration scenarios

### Fixed
- **Global Package Issue**: Resolved issue where globally installed old SDK version was conflicting with local updates
- **Language Parameter Flow**: Improved debugging and validation of language parameters from client to server
- **Demo Language Controls**: Fixed language selection behavior in web demo

## [0.3.0] - 2024-12-19

### Added
- **Language Configuration Support**: Added `sourceLanguage` and `targetLanguage` parameters to MaestraClient
- **Server Language Control**: Client can now send language preferences to server for storage in database
- **Enhanced CLI Options**: Added `--sourceLanguage`, `--targetLanguage`, and `--saveAfter` flags to CLI tool
- **Backward Compatibility**: Maintained support for legacy `language` parameter
- **Conditional Parameter Sending**: Only sends language parameters to server when explicitly provided by client
- **Translation Events**: Added support for `interim-translation` and `finalized-translation` events
- **Language Detection Events**: Added support for `language-detected` event
- **Comprehensive Documentation**: Updated README with language configuration examples and API reference

### Changed
- **WebSocket Protocol**: Now sends `sourceLanguage` instead of `language` to match server expectations
- **Parameter Handling**: Language parameters are only included in server communication when explicitly set
- **CLI Interface**: Enhanced CLI with better language configuration options and feedback

### Fixed
- **Language Parameter Mapping**: Properly maps client language options to server-expected parameter names
- **Null Handling**: Improved handling of undefined/null language parameters

## [0.2.0] - 2025-01-02

### Added
- **CLI Tool**: Added comprehensive command-line interface (`maestra-cli`)
  - Global installation support via `npm install -g @maestra-ai/maestra-client-sdk`
  - Support for all audio sources (microphone, files, HLS, RTMP/S, RTSP, SRT)
  - Real-time transcription and translation from command line
  - Comprehensive help and usage examples

- **Enhanced Web Demo**: 
  - Improved language display (source and target languages always visible)
  - Better UI styling with gradient backgrounds and enhanced visual design
  - Fixed translation/transcription routing issues
  - Added proper status messages for different stream types

- **Complete JSDoc Documentation**:
  - Full API documentation for all SDK components
  - CLI tool documentation with examples
  - Demo server and client documentation
  - WebSocket client documentation
  - Professional HTML documentation with examples

- **Examples Directory**: 
  - Moved CLI tool to `examples/` for better organization
  - Added comprehensive README with usage instructions
  - Multiple usage methods (global CLI, npm scripts, direct execution)

### Changed
- **Package Structure**: Reorganized for better maintainability
  - Added `examples/` directory with CLI tool
  - Enhanced `demo/` with better documentation
  - Comprehensive `docs/` with JSDoc-generated documentation

- **Demo Improvements**:
  - Removed debug logging for production-ready code
  - Enhanced language information display
  - Better error handling and user feedback
  - Improved CSS styling and user experience

### Fixed
- Translation and transcription output routing in web demo
- Language detection and display consistency
- Stream processing status messages
- Audio resampling performance improvements

## [0.1.0] - 2024-12-31

### Added
- Initial release of Maestra Client SDK
- Core SDK with MaestraClient and audio processors
- Support for multiple audio sources (microphone, HLS, RTMP/S, RTSP, SRT)
- Real-time transcription and translation capabilities
- Web demo with modern interface
- WebSocket-based communication 