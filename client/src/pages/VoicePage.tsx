import { useState, useEffect, useRef } from "react";
import { mediaService } from '@/lib/media-service';
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app-header";
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Volume2,
  Info, 
  CheckCircle, 
  XCircle,
  AudioLines,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

interface AudioRecording {
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  volume: number;
}

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  language: string;
}

export default function VoicePage() {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    volume: 0
  });
  
  // Voice input state
  const [voiceInput, setVoiceInput] = useState<VoiceInputState>({
    isListening: false,
    transcript: '',
    confidence: 0,
    language: 'en-US'
  });
  
  // Audio recordings
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackVolume, setPlaybackVolume] = useState([50]);
  
  // Permissions and capabilities
  const [permissions, setPermissions] = useState({
    microphone: false,
    checked: false
  });
  const [capabilities, setCApabilities] = useState({
    mediaSupported: false,
    mediaRecorderSupported: false,
    speechRecognitionSupported: false,
    secureContext: false
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      // Check capabilities
      setCApabilities({
        mediaSupported: mediaService.isMediaSupported(),
        mediaRecorderSupported: mediaService.checkMediaRecorderSupport(),
        speechRecognitionSupported: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
        secureContext: mediaService.isSecureContext()
      });

      // Check permissions
      await checkPermissions();
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (recordingState.isRecording) {
        stopRecording();
      }
      if (voiceInput.isListening) {
        stopVoiceInput();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Audio playback time update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setPlaybackTime(audio.currentTime);
    };

    const handleEnd = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnd);
    };
  }, [currentRecording]);

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playbackVolume[0] / 100;
    }
  }, [playbackVolume]);

  const checkPermissions = async () => {
    try {
      const mediaPermissions = await mediaService.checkPermissions();
      setPermissions({
        microphone: mediaPermissions.microphone,
        checked: true
      });
    } catch (error) {
      console.error('Permission check failed:', error);
      setPermissions({ microphone: false, checked: true });
    }
  };

  const startRecording = async () => {
    if (!capabilities.mediaSupported) {
      toast({
        title: "Not Supported",
        description: "Microphone recording is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Start microphone stream
      await mediaService.startMicrophoneRecording();
      
      // Start audio recording
      await mediaService.startAudioRecording();
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0
      }));

      // Start duration timer and volume monitoring
      const startTime = Date.now();
      const updateRecordingState = () => {
        if (recordingState.isRecording) {
          const elapsed = (Date.now() - startTime) / 1000;
          setRecordingState(prev => ({
            ...prev,
            duration: elapsed,
            volume: Math.random() * 100 // Simulated volume - in real app would use actual audio analysis
          }));
          animationRef.current = requestAnimationFrame(updateRecordingState);
        }
      };
      updateRecordingState();

      toast({
        title: "Recording Started! 🎤",
        description: "Microphone is now recording audio",
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording Error",
        description: `Failed to start recording: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsLoading(true);
      
      // Stop animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Stop recording
      const audioBlob = await mediaService.stopAudioRecording();
      mediaService.stopMicrophone();

      // Create recording object
      const recording: AudioRecording = {
        blob: audioBlob,
        url: URL.createObjectURL(audioBlob),
        duration: recordingState.duration,
        timestamp: new Date()
      };

      setRecordings(prev => [recording, ...prev]);
      setCurrentRecording(recording);
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        duration: 0,
        volume: 0
      }));

      toast({
        title: "Recording Saved! 💾",
        description: `Recorded ${recording.duration.toFixed(1)} seconds of audio`,
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      toast({
        title: "Stop Recording Error",
        description: `Failed to stop recording: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const playRecording = (recording: AudioRecording) => {
    if (!audioRef.current) return;

    if (isPlaying && currentRecording === recording) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setCurrentRecording(recording);
      audioRef.current.src = recording.url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadRecording = (recording: AudioRecording, index: number) => {
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = `platemate-recording-${index + 1}.webm`;
    link.click();

    toast({
      title: "Recording Downloaded! 💾",
      description: "Audio file has been saved to your downloads",
    });
  };

  const startVoiceInput = async () => {
    if (!capabilities.speechRecognitionSupported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceInput.language;

      recognition.onstart = () => {
        setVoiceInput(prev => ({ ...prev, isListening: true, transcript: '' }));
        toast({
          title: "Listening... 👂",
          description: "Speech recognition is active",
        });
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setVoiceInput(prev => ({
              ...prev,
              transcript: prev.transcript + transcript,
              confidence: confidence || 0
            }));
          } else {
            interimTranscript += transcript;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setVoiceInput(prev => ({ ...prev, isListening: false }));
        toast({
          title: "Speech Error",
          description: `Speech recognition error: ${event.error}`,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setVoiceInput(prev => ({ ...prev, isListening: false }));
      };

      recognition.start();
      (window as any).currentRecognition = recognition;
    } catch (error) {
      console.error('Failed to start voice input:', error);
      toast({
        title: "Voice Input Error",
        description: `Failed to start voice input: ${error}`,
        variant: "destructive",
      });
    }
  };

  const stopVoiceInput = () => {
    if ((window as any).currentRecognition) {
      (window as any).currentRecognition.stop();
    }
    setVoiceInput(prev => ({ ...prev, isListening: false }));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-100 dark:from-purple-900 dark:via-pink-900 dark:to-rose-900">
      <AppHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Voice & Recording Test
          </h1>
          <p className="text-lg text-muted-foreground">
            Test microphone recording and voice input functionality
          </p>
        </div>

        {/* Capabilities Card */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Device Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Media API Support:</span>
                  <Badge variant={capabilities.mediaSupported ? "default" : "destructive"} className="flex items-center gap-1">
                    {capabilities.mediaSupported ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {capabilities.mediaSupported ? 'Supported' : 'Not Supported'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">MediaRecorder:</span>
                  <Badge variant={capabilities.mediaRecorderSupported ? "default" : "destructive"} className="flex items-center gap-1">
                    {capabilities.mediaRecorderSupported ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {capabilities.mediaRecorderSupported ? 'Supported' : 'Not Supported'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Speech Recognition:</span>
                  <Badge variant={capabilities.speechRecognitionSupported ? "default" : "destructive"} className="flex items-center gap-1">
                    {capabilities.speechRecognitionSupported ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {capabilities.speechRecognitionSupported ? 'Supported' : 'Not Supported'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Microphone Permission:</span>
                  <Badge variant={permissions.microphone ? "default" : "destructive"} className="flex items-center gap-1">
                    {permissions.microphone ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {permissions.microphone ? 'Granted' : 'Denied'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={checkPermissions}
              disabled={isLoading}
              variant="ghost"
              className="w-full mt-4"
              data-testid="button-refresh-permissions"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Permissions
            </Button>
          </CardContent>
        </Card>

        {/* Recording Controls */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Audio Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recording Button */}
            <div className="flex justify-center">
              {!recordingState.isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={isLoading || !capabilities.mediaSupported}
                  size="lg"
                  className="h-20 w-20 rounded-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg"
                  data-testid="button-start-recording"
                >
                  <Mic className="h-8 w-8" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  disabled={isLoading}
                  size="lg"
                  className="h-20 w-20 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg animate-pulse"
                  data-testid="button-stop-recording"
                >
                  <Square className="h-8 w-8" />
                </Button>
              )}
            </div>

            {/* Recording Status */}
            {recordingState.isRecording && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                    {formatTime(recordingState.duration)}
                  </p>
                  <p className="text-sm text-muted-foreground">Recording...</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Volume Level</span>
                    <span>{Math.round(recordingState.volume)}%</span>
                  </div>
                  <Progress value={recordingState.volume} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Input */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Voice Input Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Button
                onClick={voiceInput.isListening ? stopVoiceInput : startVoiceInput}
                disabled={!capabilities.speechRecognitionSupported}
                className={`h-16 px-8 ${
                  voiceInput.isListening 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse' 
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                } text-white font-semibold`}
                data-testid="button-voice-input"
              >
                {voiceInput.isListening ? (
                  <>
                    <MicOff className="mr-2 h-5 w-5" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Start Voice Input
                  </>
                )}
              </Button>
            </div>

            {voiceInput.transcript && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6 border border-purple-200/30 dark:border-purple-700/30">
                <h4 className="font-semibold mb-3 text-purple-700 dark:text-purple-300">Transcript:</h4>
                <p className="text-lg leading-relaxed" data-testid="text-voice-transcript">
                  {voiceInput.transcript}
                </p>
                {voiceInput.confidence > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm font-medium">Confidence:</span>
                    <Progress value={voiceInput.confidence * 100} className="flex-1 h-2" />
                    <span className="text-sm">{Math.round(voiceInput.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recordings List */}
        {recordings.length > 0 && (
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AudioLines className="h-5 w-5" />
                Recordings ({recordings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Audio Element */}
              <audio ref={audioRef} style={{ display: 'none' }} />

              {/* Volume Control */}
              {currentRecording && (
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                  <Volume2 className="h-4 w-4" />
                  <Slider
                    value={playbackVolume}
                    onValueChange={setPlaybackVolume}
                    max={100}
                    step={1}
                    className="flex-1"
                    data-testid="slider-volume"
                  />
                  <span className="text-sm w-10">{playbackVolume[0]}%</span>
                </div>
              )}

              {/* Recording Items */}
              {recordings.map((recording, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl"
                  data-testid={`recording-item-${index}`}
                >
                  <Button
                    onClick={() => playRecording(recording)}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 rounded-full p-0"
                    data-testid={`button-play-recording-${index}`}
                  >
                    {isPlaying && currentRecording === recording ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Recording #{recordings.length - index}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(recording.duration)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {recording.timestamp.toLocaleString()}
                    </p>
                    
                    {/* Playback Progress */}
                    {isPlaying && currentRecording === recording && (
                      <div className="mt-2">
                        <Progress 
                          value={(playbackTime / recording.duration) * 100} 
                          className="h-1"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{formatTime(playbackTime)}</span>
                          <span>{formatTime(recording.duration)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => downloadRecording(recording, index)}
                    variant="ghost"
                    size="sm"
                    data-testid={`button-download-recording-${index}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}