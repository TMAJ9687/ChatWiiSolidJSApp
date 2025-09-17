import { Component, createSignal, onMount, For, Show } from "solid-js";
import { FiSave, FiPlus, FiTrash2, FiDownload, FiUpload, FiSearch, FiCheck, FiX, FiAlertTriangle } from "solid-icons/fi";
import { profanityService } from "../../../services/supabase/profanityService";
import { createServiceLogger } from "../../../utils/logger";

interface ProfanityWord {
  id: string;
  word: string;
  type: 'nickname' | 'chat';
  createdBy: string;
  createdAt: string;
}

interface ProfanityManagerProps {
  currentUserId: string;
}

const logger = createServiceLogger('ProfanityManager');

const ProfanityManager: Component<ProfanityManagerProps> = (props) => {
  const [nicknameWords, setNicknameWords] = createSignal<ProfanityWord[]>([]);
  const [chatWords, setChatWords] = createSignal<ProfanityWord[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  
  // Add word states
  const [newNicknameWord, setNewNicknameWord] = createSignal("");
  const [newChatWord, setNewChatWord] = createSignal("");
  
  // Search and filter states
  const [nicknameSearch, setNicknameSearch] = createSignal("");
  const [chatSearch, setChatSearch] = createSignal("");
  
  // Testing interface states
  const [testText, setTestText] = createSignal("");
  const [testType, setTestType] = createSignal<'nickname' | 'chat'>('chat');
  const [testResult, setTestResult] = createSignal<{ isClean: boolean; blockedWords: string[] } | null>(null);
  const [testing, setTesting] = createSignal(false);

  onMount(() => {
    loadWords();
  });

  const loadWords = async () => {
    setLoading(true);
    try {
      const [nickname, chat] = await Promise.all([
        profanityService.getWords('nickname'),
        profanityService.getWords('chat'),
      ]);
      
      setNicknameWords(nickname);
      setChatWords(chat);
    } catch (error) {
      logger.error("Error loading profanity words:", error);
    } finally {
      setLoading(false);
    }
  };

  const addWord = async (word: string, type: 'nickname' | 'chat') => {
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) return;

    // Check if word already exists
    const existingWords = type === 'nickname' ? nicknameWords() : chatWords();
    if (existingWords.some(w => w.word === trimmedWord)) {
      alert(`Word "${trimmedWord}" already exists in ${type} list`);
      return;
    }

    setSaving(true);
    try {
      await profanityService.addWord(trimmedWord, type);
      await loadWords(); // Reload to get the new word with ID
      
      // Clear input
      if (type === 'nickname') {
        setNewNicknameWord("");
      } else {
        setNewChatWord("");
      }
    } catch (error) {
      logger.error("Error adding word:", error);
      alert("Failed to add word. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeWord = async (wordId: string, type: 'nickname' | 'chat') => {
    if (!confirm("Are you sure you want to remove this word?")) return;

    setSaving(true);
    try {
      await profanityService.removeWord(wordId);
      await loadWords(); // Reload to update the list
    } catch (error) {
      logger.error("Error removing word:", error);
      alert("Failed to remove word. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const testProfanity = async () => {
    const text = testText().trim();
    if (!text) return;

    setTesting(true);
    try {
      const isClean = await profanityService.checkText(text, testType());
      
      // Find which words are blocked
      const words = testType() === 'nickname' ? nicknameWords() : chatWords();
      const blockedWords = words
        .filter(w => text.toLowerCase().includes(w.word.toLowerCase()))
        .map(w => w.word);

      setTestResult({
        isClean,
        blockedWords,
      });
    } catch (error) {
      logger.error("Error testing profanity:", error);
      alert("Failed to test text. Please try again.");
    } finally {
      setTesting(false);
    }
  };

  const exportWords = (type: 'nickname' | 'chat') => {
    const words = type === 'nickname' ? nicknameWords() : chatWords();
    const wordList = words.map(w => w.word).join('\n');
    
    const blob = new Blob([wordList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatwii-${type}-profanity-words.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importWords = async (event: Event, type: 'nickname' | 'chat') => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      const text = await file.text();
      const words = text.split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0);

      if (words.length === 0) {
        alert("No valid words found in the file.");
        return;
      }

      if (!confirm(`Import ${words.length} words to ${type} list? This will add to existing words.`)) {
        return;
      }

      setSaving(true);
      let addedCount = 0;
      let skippedCount = 0;

      for (const word of words) {
        try {
          // Check if word already exists
          const existingWords = type === 'nickname' ? nicknameWords() : chatWords();
          if (existingWords.some(w => w.word === word)) {
            skippedCount++;
            continue;
          }

          await profanityService.addWord(word, type);
          addedCount++;
        } catch (error) {
          logger.error(`Error adding word "${word}":`, error);
          skippedCount++;
        }
      }

      await loadWords();
      alert(`Import complete! Added: ${addedCount}, Skipped: ${skippedCount}`);
    } catch (error) {
      logger.error("Error importing words:", error);
      alert("Failed to import words. Please check the file format.");
    } finally {
      setSaving(false);
      input.value = ""; // Reset file input
    }
  };

  const filteredNicknameWords = () => {
    const search = nicknameSearch().toLowerCase();
    return nicknameWords().filter(w => 
      search === "" || w.word.toLowerCase().includes(search)
    );
  };

  const filteredChatWords = () => {
    const search = chatSearch().toLowerCase();
    return chatWords().filter(w => 
      search === "" || w.word.toLowerCase().includes(search)
    );
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Profanity Manager
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage blocked words for nicknames and chat messages
          </p>
        </div>
      </div>

      <Show when={loading()}>
        <div class="text-center py-8">
          <div class="text-gray-500 dark:text-gray-400">Loading profanity words...</div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="space-y-6">
          {/* Testing Interface */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Profanity Detection Testing
              </h3>
              
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Text
                    </label>
                    <input
                      type="text"
                      value={testText()}
                      onInput={(e) => setTestText(e.currentTarget.value)}
                      placeholder="Enter text to test for profanity..."
                      class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Type
                    </label>
                    <select
                      value={testType()}
                      onChange={(e) => setTestType(e.currentTarget.value as 'nickname' | 'chat')}
                      class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="chat">Chat Message</option>
                      <option value="nickname">Nickname</option>
                    </select>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button
                    onClick={testProfanity}
                    disabled={testing() || !testText().trim()}
                    class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <FiSearch size={16} />
                    {testing() ? "Testing..." : "Test Text"}
                  </button>
                </div>

                <Show when={testResult()}>
                  <div class={`p-4 rounded-lg border ${
                    testResult()!.isClean 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}>
                    <div class="flex items-center gap-2 mb-2">
                      {testResult()!.isClean ? (
                        <FiCheck class="text-green-600 dark:text-green-400" size={20} />
                      ) : (
                        <FiX class="text-red-600 dark:text-red-400" size={20} />
                      )}
                      <span class={`font-medium ${
                        testResult()!.isClean 
                          ? "text-green-800 dark:text-green-200" 
                          : "text-red-800 dark:text-red-200"
                      }`}>
                        {testResult()!.isClean ? "Text is clean" : "Profanity detected"}
                      </span>
                    </div>
                    
                    <Show when={!testResult()!.isClean && testResult()!.blockedWords.length > 0}>
                      <p class="text-sm text-red-700 dark:text-red-300">
                        Blocked words: {testResult()!.blockedWords.join(", ")}
                      </p>
                    </Show>
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Nickname Words */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  Nickname Blocked Words ({nicknameWords().length})
                </h3>
                <div class="mt-2 sm:mt-0 flex gap-2">
                  <button
                    onClick={() => exportWords('nickname')}
                    class="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <FiDownload size={14} />
                    Export
                  </button>
                  <label class="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
                    <FiUpload size={14} />
                    Import
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => importWords(e, 'nickname')}
                      class="hidden"
                    />
                  </label>
                </div>
              </div>

              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Words blocked in user nicknames. Users cannot use these words when setting their display names.
              </p>

              {/* Add new nickname word */}
              <div class="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newNicknameWord()}
                  onInput={(e) => setNewNicknameWord(e.currentTarget.value)}
                  onKeyPress={(e) => e.key === "Enter" && addWord(newNicknameWord(), 'nickname')}
                  placeholder="Add blocked word for nicknames..."
                  class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => addWord(newNicknameWord(), 'nickname')}
                  disabled={saving() || !newNicknameWord().trim()}
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <FiPlus size={16} />
                  Add
                </button>
              </div>

              {/* Search nickname words */}
              <div class="mb-4">
                <div class="relative">
                  <FiSearch class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={nicknameSearch()}
                    onInput={(e) => setNicknameSearch(e.currentTarget.value)}
                    placeholder="Search nickname words..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Nickname words list */}
              <div class="max-h-64 overflow-y-auto">
                <Show when={filteredNicknameWords().length === 0}>
                  <p class="text-center text-gray-500 dark:text-gray-400 py-4">
                    No nickname words found
                  </p>
                </Show>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <For each={filteredNicknameWords()}>
                    {(word) => (
                      <div class="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                        <span class="text-sm font-mono">{word.word}</span>
                        <button
                          onClick={() => removeWord(word.id, 'nickname')}
                          disabled={saving()}
                          class="text-red-500 hover:text-red-700 disabled:opacity-50 ml-2"
                          title="Remove word"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Words */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  Chat Blocked Words ({chatWords().length})
                </h3>
                <div class="mt-2 sm:mt-0 flex gap-2">
                  <button
                    onClick={() => exportWords('chat')}
                    class="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <FiDownload size={14} />
                    Export
                  </button>
                  <label class="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
                    <FiUpload size={14} />
                    Import
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => importWords(e, 'chat')}
                      class="hidden"
                    />
                  </label>
                </div>
              </div>

              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Words blocked in chat messages. Messages containing these words will be rejected.
              </p>

              {/* Add new chat word */}
              <div class="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newChatWord()}
                  onInput={(e) => setNewChatWord(e.currentTarget.value)}
                  onKeyPress={(e) => e.key === "Enter" && addWord(newChatWord(), 'chat')}
                  placeholder="Add blocked word for chat..."
                  class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => addWord(newChatWord(), 'chat')}
                  disabled={saving() || !newChatWord().trim()}
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <FiPlus size={16} />
                  Add
                </button>
              </div>

              {/* Search chat words */}
              <div class="mb-4">
                <div class="relative">
                  <FiSearch class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={chatSearch()}
                    onInput={(e) => setChatSearch(e.currentTarget.value)}
                    placeholder="Search chat words..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Chat words list */}
              <div class="max-h-64 overflow-y-auto">
                <Show when={filteredChatWords().length === 0}>
                  <p class="text-center text-gray-500 dark:text-gray-400 py-4">
                    No chat words found
                  </p>
                </Show>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <For each={filteredChatWords()}>
                    {(word) => (
                      <div class="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                        <span class="text-sm font-mono">{word.word}</span>
                        <button
                          onClick={() => removeWord(word.id, 'chat')}
                          disabled={saving()}
                          class="text-red-500 hover:text-red-700 disabled:opacity-50 ml-2"
                          title="Remove word"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div class="flex items-start gap-2">
              <FiAlertTriangle class="text-blue-600 dark:text-blue-400 mt-0.5" size={16} />
              <div>
                <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Usage Instructions
                </h4>
                <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Nickname words prevent users from using those words in their display names</li>
                  <li>• Chat words block messages containing those words from being sent</li>
                  <li>• Word matching is case-insensitive and checks for partial matches</li>
                  <li>• Use the testing interface to verify how words will be filtered</li>
                  <li>• Import/export features support plain text files with one word per line</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ProfanityManager;