import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface PermissionDebuggerProps {
  onClose: () => void;
}

export function PermissionDebugger({ onClose }: PermissionDebuggerProps) {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const info: any = {
      timestamp: new Date().toLocaleString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      host: window.location.host,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasMediaDevices: !!navigator.mediaDevices,
      permissions: {},
      mediaConstraints: {},
      errors: []
    };

    // Check if we're in Replit mobile app
    info.isReplitApp = /Replit-Bonsai/.test(navigator.userAgent);
    info.isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);

    // Test permissions API
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        info.permissions.camera = {
          state: cameraPermission.state,
          supported: true
        };
      } catch (error: any) {
        info.permissions.camera = {
          error: error.message,
          supported: false
        };
      }
    } else {
      info.permissions.camera = { supported: false, reason: 'Permissions API not available' };
    }

    // Test getUserMedia with different constraints
    const constraints = [
      { video: true },
      { video: { facingMode: 'environment' } },
      { video: { facingMode: 'user' } }
    ];

    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        
        info.mediaConstraints[`test_${i + 1}`] = {
          constraint,
          success: true,
          tracks: stream.getTracks().map(track => ({
            kind: track.kind,
            label: track.label,
            readyState: track.readyState,
            enabled: track.enabled
          }))
        };
        
        // Stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
        break; // If one works, we're good
      } catch (error: any) {
        info.mediaConstraints[`test_${i + 1}`] = {
          constraint,
          success: false,
          error: {
            name: error.name,
            message: error.message,
            code: error.code || 0
          }
        };
      }
    }

    // Check for other browser features
    info.features = {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      geolocation: !!navigator.geolocation,
      serviceWorker: 'serviceWorker' in navigator,
      webRTC: !!(window as any).RTCPeerConnection,
      fullscreen: !!(document as any).fullscreenEnabled,
      notification: 'Notification' in window
    };

    setDebugInfo(info);
    setIsChecking(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const copyToClipboard = () => {
    const debugText = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(debugText).then(() => {
      alert('Debug information copied to clipboard!');
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-900 text-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">📋 Camera Permission Diagnostics</h2>
          <Button variant="outline" onClick={onClose} className="text-white border-white/20">
            Close
          </Button>
        </div>

        {isChecking ? (
          <div className="text-center py-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p>Running diagnostics...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Environment Info */}
            <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2">🌐 Environment</h3>
              <div className="text-sm space-y-1">
                <p><strong>Platform:</strong> {debugInfo.platform}</p>
                <p><strong>Secure Context:</strong> {debugInfo.isSecureContext ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Protocol:</strong> {debugInfo.protocol}</p>
                <p><strong>Replit App:</strong> {debugInfo.isReplitApp ? '📱 Yes' : '🌐 Browser'}</p>
                <p><strong>Mobile:</strong> {debugInfo.isMobile ? '📱 Yes' : '💻 Desktop'}</p>
              </div>
            </div>

            {/* Camera Support */}
            <div className="bg-green-900/30 border border-green-600/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2">📷 Camera Support</h3>
              <div className="text-sm space-y-1">
                <p><strong>getUserMedia:</strong> {debugInfo.hasGetUserMedia ? '✅ Available' : '❌ Not Available'}</p>
                <p><strong>MediaDevices API:</strong> {debugInfo.hasMediaDevices ? '✅ Available' : '❌ Not Available'}</p>
                
                {debugInfo.permissions?.camera && (
                  <p><strong>Permission State:</strong> 
                    {debugInfo.permissions.camera.supported ? 
                      `${debugInfo.permissions.camera.state === 'granted' ? '✅' : 
                        debugInfo.permissions.camera.state === 'denied' ? '❌' : '⚠️'} ${debugInfo.permissions.camera.state}` :
                      '❌ Not Supported'
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-purple-900/30 border border-purple-600/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2">🧪 Camera Tests</h3>
              <div className="text-sm space-y-2">
                {Object.entries(debugInfo.mediaConstraints || {}).map(([key, result]: [string, any]) => (
                  <div key={key} className="border-l-2 border-purple-500 pl-3">
                    <p><strong>Test {key.split('_')[1]}:</strong> {result.success ? '✅ Success' : '❌ Failed'}</p>
                    {result.success && result.tracks ? (
                      <p className="text-xs text-green-300">Camera found: {result.tracks[0]?.label || 'Camera device'}</p>
                    ) : (
                      <p className="text-xs text-red-300">Error: {result.error?.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-orange-900/30 border border-orange-600/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2">💡 Recommendations</h3>
              <div className="text-sm space-y-1">
                {debugInfo.isReplitApp ? (
                  <>
                    <p>• ⚠️ <strong>Replit Mobile App detected</strong> - camera may be blocked</p>
                    <p>• 🌐 Try opening in external browser (Chrome/Safari)</p>
                    <p>• 📝 Use manual barcode entry as reliable alternative</p>
                  </>
                ) : debugInfo.permissions?.camera?.state === 'denied' ? (
                  <>
                    <p>• ❌ <strong>Camera permission denied</strong></p>
                    <p>• ⚙️ Go to browser settings and allow camera for this site</p>
                    <p>• 🔄 Refresh page after changing permissions</p>
                  </>
                ) : !debugInfo.hasGetUserMedia ? (
                  <>
                    <p>• ❌ <strong>Camera API not supported</strong></p>
                    <p>• 📱 Update your browser to the latest version</p>
                    <p>• 🌐 Try a different browser (Chrome/Firefox)</p>
                  </>
                ) : (
                  <>
                    <p>• ✅ Camera should work - try again</p>
                    <p>• 🔄 Refresh the page and allow permissions</p>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <Button onClick={runDiagnostics} className="flex-1">
                🔄 Run Again
              </Button>
              <Button onClick={copyToClipboard} variant="outline" className="flex-1 border-white/20">
                📋 Copy Debug Info
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}