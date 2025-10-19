import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Lightbulb, Send, Sparkles, Target, ChefHat, TrendingUp, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AICoachAvatar, PersonalityType } from "@/components/ai-coach-avatar";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Personality {
  id: PersonalityType;
  name: string;
  description: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  prompt: string;
  color: string;
}

const personalities: Personality[] = [
  {
    id: 'military',
    name: 'Sergeant Stone',
    description: 'Intense, direct, no excuses'
  },
  {
    id: 'gym_bro',
    name: 'Coach Mike',
    description: 'Casual, hyped energy'
  },
  {
    id: 'zen',
    name: 'Maya',
    description: 'Calm, mindful, balanced'
  },
  {
    id: 'clinical',
    name: 'Dr. Rivera',
    description: 'Professional, evidence-based'
  },
  {
    id: 'dark_humour',
    name: 'Ryder',
    description: 'Sarcastic but supportive'
  }
];

const quickActions: QuickAction[] = [
  {
    id: 'low-cal',
    label: 'Low-Calorie Recipes',
    icon: Target,
    prompt: 'Show me healthy recipes under 500 calories',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'high-protein',
    label: 'High-Protein Meals',
    icon: TrendingUp,
    prompt: 'Suggest high-protein meal ideas (30g+ protein)',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'meal-planning',
    label: 'Meal Planning Tips',
    icon: ChefHat,
    prompt: 'Give me tips for meal planning and prep',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'nutrition-advice',
    label: 'Nutrition Advice',
    icon: Heart,
    prompt: 'What are some general nutrition tips for healthy eating?',
    color: 'from-orange-500 to-red-500'
  }
];

export default function AICoachPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>('gym_bro');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async ({ prompt, history, personality }: { prompt: string; history: Message[]; personality: PersonalityType }) => {
      const response = await apiRequest('POST', '/api/ai-coach', { 
        prompt,
        conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
        personality
      });
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    const newMessages = [...messages, {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    }];
    setMessages(newMessages);
    setInput('');
    chatMutation.mutate({ prompt: userMessage, history: newMessages, personality: selectedPersonality });
  };

  const handleQuickAction = (action: QuickAction) => {
    const newMessages = [...messages, {
      role: 'user' as const,
      content: action.prompt,
      timestamp: new Date()
    }];
    setMessages(newMessages);
    chatMutation.mutate({ prompt: action.prompt, history: newMessages, personality: selectedPersonality });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-700 dark:to-cyan-700 text-white p-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/">
              <button
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <Lightbulb className="w-8 h-8" />
            <h1 className="text-3xl font-bold">AI Coach</h1>
          </div>
          <p className="text-teal-100">Your personal nutrition and recipe assistant</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 -mt-4 pb-32">
        {/* AI Coach Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <AICoachAvatar 
            personality={selectedPersonality} 
            isThinking={chatMutation.isPending}
            size="large"
          />
        </motion.div>

        {/* Personality Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-gray-100">
            Choose Your Coach
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {personalities.map((personality) => (
              <motion.button
                key={personality.id}
                onClick={() => setSelectedPersonality(personality.id)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  selectedPersonality === personality.id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300 dark:hover:border-teal-600'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid={`button-personality-${personality.id}`}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {personality.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {personality.description}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions - Always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    disabled={chatMutation.isPending}
                    className={`p-6 rounded-2xl bg-gradient-to-r ${action.color} text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid={`button-quick-${action.id}`}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <div className="font-semibold text-lg">{action.label}</div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Chat Messages */}
          {messages.length > 0 && (
            <div className="mb-6 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
              {chatMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl">
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Area - Fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me about recipes, nutrition advice, meal planning..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none rounded-2xl border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-teal-500"
                  disabled={chatMutation.isPending}
                  data-testid="input-chat"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending}
                  className="h-[60px] px-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl"
                  data-testid="button-send"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
