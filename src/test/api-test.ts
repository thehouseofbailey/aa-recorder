// Test script to verify the recorder API functionality
// This would typically be used for automated testing

const testRecorderAPI = () => {
  console.log('Testing Recorder API...');
  
  // Check if APIs are available
  if (typeof window !== 'undefined') {
    if (window.recorder) {
      console.log('✅ window.recorder API available');
      console.log('Available methods:', Object.keys(window.recorder));
    } else {
      console.log('❌ window.recorder API not available');
    }
    
    if (window.onRecorderEvent) {
      console.log('✅ window.onRecorderEvent available');
    } else {
      console.log('❌ window.onRecorderEvent not available');
    }
  }
  
  // Test type definitions
  const testPayload: StartRecordingPayload = {
    recordingName: 'test_recording',
    mode: 'ga',
  };
  
  console.log('Test payload created:', testPayload);
};

// Export for use in renderer process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testRecorderAPI };
}