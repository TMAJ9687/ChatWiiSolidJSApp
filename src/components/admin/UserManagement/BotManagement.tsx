import React, { useState, useEffect } from 'react';
import { Bot, BotCreateRequest, BotBehaviorSettings } from '../../../types/bot.types';
import { botService } from '../../../services/supabase/botService';
import { supabase } from '../../../config/supabase';

export const BotManagement: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [stats, setStats] = useState({
    totalBots: 0,
    activeBots: 0,
    onlineBots: 0,
    botsByGender: { male: 0, female: 0 },
    botsByActivityLevel: { low: 0, medium: 0, high: 0 }
  });

  // Form state for creating/editing bots
  const [formData, setFormData] = useState<BotCreateRequest>({
    nickname: '',
    age: 25,
    gender: 'female',
    country: 'US',
    interests: [],
    behaviorSettings: {
      responseDelay: 2000,
      activityLevel: 'medium',
      conversationStyle: 'friendly',
      autoRespond: true,
      maxMessagesPerHour: 30
    }
  });

  const [newInterest, setNewInterest] = useState('');

  // Load bots and statistics
  const loadBots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [botsResult, statsResult] = await Promise.all([
        botService.getBots(1, 100),
        botService.getBotStatistics()
      ]);
      
      setBots(botsResult.bots);
      setStats(statsResult);
    } catch (err) {
      console.error('Error loading bots:', err);
      setError('Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  // Get current admin ID
  const getCurrentAdminId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentAdminId(user.id);
      }
    } catch (err) {
      console.error('Error getting current admin ID:', err);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    getCurrentAdminId();
    loadBots();

    // Subscribe to bot changes
    const botSubscription = supabase
      .channel('bot-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bots'
        },
        () => {
          loadBots(); // Reload bots when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(botSubscription);
    };
  }, []);

  // Handle form submission for creating/editing bots
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      if (editingBot) {
        // Update existing bot
        const result = await botService.updateBot(editingBot.id, formData, currentAdminId);
        if (!result.success) {
          setError(result.message || 'Failed to update bot');
          return;
        }
      } else {
        // Create new bot
        const result = await botService.createBot(formData, currentAdminId);
        if (!result.success) {
          setError(result.message || 'Failed to create bot');
          return;
        }
      }
      
      // Reset form and reload bots
      resetForm();
      await loadBots();
    } catch (err) {
      console.error('Error submitting bot form:', err);
      setError('An error occurred while saving the bot');
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      nickname: '',
      age: 25,
      gender: 'female',
      country: 'US',
      interests: [],
      behaviorSettings: {
        responseDelay: 2000,
        activityLevel: 'medium',
        conversationStyle: 'friendly',
        autoRespond: true,
        maxMessagesPerHour: 30
      }
    });
    setNewInterest('');
    setShowCreateForm(false);
    setEditingBot(null);
    setError(null);
  };

  // Handle editing a bot
  const handleEdit = (bot: Bot) => {
    setFormData({
      nickname: bot.nickname,
      age: bot.age,
      gender: bot.gender,
      country: bot.country,
      interests: [...bot.interests],
      behaviorSettings: { ...bot.behaviorSettings }
    });
    setEditingBot(bot);
    setShowCreateForm(true);
  };

  // Handle deleting a bot
  const handleDelete = async (bot: Bot) => {
    if (!confirm(`Are you sure you want to delete bot "${bot.nickname}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await botService.deleteBot(bot.id, currentAdminId);
      if (!result.success) {
        setError(result.message || 'Failed to delete bot');
        return;
      }
      
      await loadBots();
    } catch (err) {
      console.error('Error deleting bot:', err);
      setError('Failed to delete bot');
    }
  };

  // Handle toggling bot status
  const handleToggleStatus = async (bot: Bot) => {
    try {
      const result = await botService.toggleBotStatus(bot.id, currentAdminId);
      if (!result.success) {
        setError(result.message || 'Failed to toggle bot status');
        return;
      }
      
      await loadBots();
    } catch (err) {
      console.error('Error toggling bot status:', err);
      setError('Failed to toggle bot status');
    }
  };

  // Handle adding interest
  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({
        ...formData,
        interests: [...formData.interests, newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  // Handle removing interest
  const handleRemoveInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(i => i !== interest)
    });
  };

  // Handle behavior settings change
  const handleBehaviorChange = (key: keyof BotBehaviorSettings, value: any) => {
    setFormData({
      ...formData,
      behaviorSettings: {
        ...formData.behaviorSettings!,
        [key]: value
      }
    });
  };

  const countries = [
    'US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI',
    'BR', 'MX', 'AR', 'JP', 'KR', 'CN', 'IN', 'RU', 'PL', 'TR', 'EG', 'ZA'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading bots...</span>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        {/* Header with stats */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Bot Management</h3>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <div className="font-medium text-blue-900">Total Bots</div>
                <div className="text-blue-600">{stats.totalBots}</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-900">Active Bots</div>
                <div className="text-green-600">{stats.activeBots}</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <div className="font-medium text-yellow-900">Online Bots</div>
                <div className="text-yellow-600">{stats.onlineBots}</div>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <div className="font-medium text-purple-900">Gender Split</div>
                <div className="text-purple-600">M:{stats.botsByGender.male} F:{stats.botsByGender.female}</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create Bot
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Bot Form */}
        {showCreateForm && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {editingBot ? 'Edit Bot' : 'Create New Bot'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nickname *
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interests
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add an interest..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                  />
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(interest)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Behavior Settings */}
              <div className="border-t pt-4">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Behavior Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity Level
                    </label>
                    <select
                      value={formData.behaviorSettings?.activityLevel}
                      onChange={(e) => handleBehaviorChange('activityLevel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conversation Style
                    </label>
                    <select
                      value={formData.behaviorSettings?.conversationStyle}
                      onChange={(e) => handleBehaviorChange('conversationStyle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="friendly">Friendly</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Response Delay (ms)
                    </label>
                    <input
                      type="number"
                      min="500"
                      max="10000"
                      step="500"
                      value={formData.behaviorSettings?.responseDelay}
                      onChange={(e) => handleBehaviorChange('responseDelay', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Messages/Hour
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.behaviorSettings?.maxMessagesPerHour}
                      onChange={(e) => handleBehaviorChange('maxMessagesPerHour', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.behaviorSettings?.autoRespond}
                      onChange={(e) => handleBehaviorChange('autoRespond', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-respond to messages</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {editingBot ? 'Update Bot' : 'Create Bot'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bots List */}
        {bots.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bots found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first bot.</p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Behavior
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${bot.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{bot.nickname}</div>
                          <div className="text-sm text-gray-500">
                            {bot.age} • {bot.gender} • {bot.country}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        bot.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bot.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{bot.behaviorSettings.activityLevel} activity</div>
                      <div>{bot.behaviorSettings.conversationStyle} style</div>
                      <div>{bot.behaviorSettings.maxMessagesPerHour} msg/hr</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {bot.interests.slice(0, 3).map((interest, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                          >
                            {interest}
                          </span>
                        ))}
                        {bot.interests.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{bot.interests.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(bot)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(bot)}
                        className={`px-2 py-1 rounded ${
                          bot.isActive
                            ? 'text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100'
                            : 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {bot.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(bot)}
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};