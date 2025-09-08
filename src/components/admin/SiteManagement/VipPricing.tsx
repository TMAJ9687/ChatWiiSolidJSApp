import { Component, createSignal, onMount, Show, For } from "solid-js";
import { FiSave, FiRefreshCw, FiDollarSign, FiTrendingUp, FiCalendar, FiHistory } from "solid-icons/fi";
import { siteSettingsService } from "../../../services/supabase/siteSettingsService";

interface VipPricingData {
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
}

interface PriceHistory {
  id: string;
  priceType: 'monthly' | 'quarterly' | 'yearly';
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

interface VipPricingProps {
  currentUserId: string;
}

const VipPricing: Component<VipPricingProps> = (props) => {
  const [pricing, setPricing] = createSignal<VipPricingData>({
    monthlyPrice: 9.99,
    quarterlyPrice: 24.99,
    yearlyPrice: 89.99,
  });

  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<Record<string, string>>({});
  const [priceHistory, setPriceHistory] = createSignal<PriceHistory[]>([]);
  const [showHistory, setShowHistory] = createSignal(false);

  onMount(() => {
    loadPricing();
    loadPriceHistory();
  });

  const loadPricing = async () => {
    setLoading(true);
    try {
      const [monthlyPrice, quarterlyPrice, yearlyPrice] = await Promise.all([
        siteSettingsService.getSetting("vip_monthly_price"),
        siteSettingsService.getSetting("vip_quarterly_price"),
        siteSettingsService.getSetting("vip_yearly_price"),
      ]);

      setPricing({
        monthlyPrice: parseFloat(monthlyPrice) || 9.99,
        quarterlyPrice: parseFloat(quarterlyPrice) || 24.99,
        yearlyPrice: parseFloat(yearlyPrice) || 89.99,
      });
    } catch (error) {
      console.error("Error loading VIP pricing:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPriceHistory = async () => {
    try {
      const historyData = await siteSettingsService.getSetting("vip_price_history");
      if (historyData) {
        const history = JSON.parse(historyData);
        setPriceHistory(history.slice(0, 10)); // Show last 10 changes
      }
    } catch (error) {
      console.error("Error loading price history:", error);
    }
  };

  const validatePricing = (): boolean => {
    const errors: Record<string, string> = {};
    const currentPricing = pricing();

    // Validate price ranges
    if (currentPricing.monthlyPrice < 0.99 || currentPricing.monthlyPrice > 99.99) {
      errors.monthlyPrice = "Monthly price must be between $0.99 and $99.99";
    }
    if (currentPricing.quarterlyPrice < 2.99 || currentPricing.quarterlyPrice > 299.99) {
      errors.quarterlyPrice = "Quarterly price must be between $2.99 and $299.99";
    }
    if (currentPricing.yearlyPrice < 9.99 || currentPricing.yearlyPrice > 999.99) {
      errors.yearlyPrice = "Yearly price must be between $9.99 and $999.99";
    }

    // Validate pricing logic (longer terms should offer better value)
    const monthlyValue = currentPricing.monthlyPrice;
    const quarterlyValue = currentPricing.quarterlyPrice / 3;
    const yearlyValue = currentPricing.yearlyPrice / 12;

    if (quarterlyValue >= monthlyValue) {
      errors.quarterlyPrice = "Quarterly price should offer better value than monthly (currently $" + quarterlyValue.toFixed(2) + "/month)";
    }
    if (yearlyValue >= monthlyValue) {
      errors.yearlyPrice = "Yearly price should offer better value than monthly (currently $" + yearlyValue.toFixed(2) + "/month)";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const savePricing = async () => {
    if (!validatePricing()) {
      return;
    }

    setSaving(true);
    try {
      const currentPricing = pricing();
      const oldPricing = {
        monthlyPrice: parseFloat(await siteSettingsService.getSetting("vip_monthly_price")) || 9.99,
        quarterlyPrice: parseFloat(await siteSettingsService.getSetting("vip_quarterly_price")) || 24.99,
        yearlyPrice: parseFloat(await siteSettingsService.getSetting("vip_yearly_price")) || 89.99,
      };

      // Save new pricing
      await Promise.all([
        siteSettingsService.updateSetting("vip_monthly_price", currentPricing.monthlyPrice.toString()),
        siteSettingsService.updateSetting("vip_quarterly_price", currentPricing.quarterlyPrice.toString()),
        siteSettingsService.updateSetting("vip_yearly_price", currentPricing.yearlyPrice.toString()),
      ]);

      // Record price changes in history
      const changes: PriceHistory[] = [];
      const timestamp = new Date().toISOString();

      if (oldPricing.monthlyPrice !== currentPricing.monthlyPrice) {
        changes.push({
          id: `monthly_${Date.now()}`,
          priceType: 'monthly',
          oldPrice: oldPricing.monthlyPrice,
          newPrice: currentPricing.monthlyPrice,
          changedBy: props.currentUserId,
          changedAt: timestamp,
        });
      }
      if (oldPricing.quarterlyPrice !== currentPricing.quarterlyPrice) {
        changes.push({
          id: `quarterly_${Date.now()}`,
          priceType: 'quarterly',
          oldPrice: oldPricing.quarterlyPrice,
          newPrice: currentPricing.quarterlyPrice,
          changedBy: props.currentUserId,
          changedAt: timestamp,
        });
      }
      if (oldPricing.yearlyPrice !== currentPricing.yearlyPrice) {
        changes.push({
          id: `yearly_${Date.now()}`,
          priceType: 'yearly',
          oldPrice: oldPricing.yearlyPrice,
          newPrice: currentPricing.yearlyPrice,
          changedBy: props.currentUserId,
          changedAt: timestamp,
        });
      }

      if (changes.length > 0) {
        const existingHistory = priceHistory();
        const newHistory = [...changes, ...existingHistory].slice(0, 50); // Keep last 50 changes
        await siteSettingsService.updateSetting("vip_price_history", JSON.stringify(newHistory));
        setPriceHistory(newHistory.slice(0, 10));
      }

      alert("VIP pricing updated successfully! Changes will be reflected on the site immediately.");
    } catch (error) {
      console.error("Error saving VIP pricing:", error);
      alert("Failed to save pricing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updatePrice = (type: keyof VipPricingData, value: number) => {
    setPricing({ ...pricing(), [type]: value });
    
    // Clear validation error for this field
    const errors = { ...validationErrors() };
    delete errors[type];
    setValidationErrors(errors);
  };

  const resetToDefaults = () => {
    if (confirm("Are you sure you want to reset all VIP pricing to default values?")) {
      setPricing({
        monthlyPrice: 9.99,
        quarterlyPrice: 24.99,
        yearlyPrice: 89.99,
      });
      setValidationErrors({});
    }
  };

  const calculateSavings = (basePrice: number, discountedPrice: number, months: number) => {
    const totalBase = basePrice * months;
    const savings = totalBase - discountedPrice;
    const percentage = (savings / totalBase) * 100;
    return { amount: savings, percentage };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            VIP Pricing Management
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure VIP subscription pricing tiers and track changes
          </p>
        </div>
        <div class="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory())}
            class="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            <FiHistory size={14} />
            {showHistory() ? "Hide" : "Show"} History
          </button>
          <button
            onClick={resetToDefaults}
            class="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            <FiRefreshCw size={14} />
            Reset
          </button>
          <button
            onClick={savePricing}
            disabled={saving() || loading()}
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            <FiSave size={14} />
            {saving() ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <Show when={loading()}>
        <div class="text-center py-8">
          <div class="text-gray-500 dark:text-gray-400">Loading VIP pricing...</div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="space-y-6">
          {/* Pricing Tiers */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Monthly */}
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center gap-2 mb-4">
                  <FiCalendar class="text-blue-600 dark:text-blue-400" size={20} />
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    Monthly Plan
                  </h3>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price (USD)
                    </label>
                    <div class="relative">
                      <FiDollarSign class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        min="0.99"
                        max="99.99"
                        value={pricing().monthlyPrice}
                        onInput={(e) => updatePrice("monthlyPrice", parseFloat(e.currentTarget.value) || 0)}
                        class={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors().monthlyPrice 
                            ? "border-red-300 dark:border-red-600" 
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    </div>
                    <Show when={validationErrors().monthlyPrice}>
                      <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors().monthlyPrice}
                      </p>
                    </Show>
                  </div>

                  <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(pricing().monthlyPrice)}
                    </div>
                    <div class="text-sm text-blue-700 dark:text-blue-300">
                      per month
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quarterly */}
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center gap-2 mb-4">
                  <FiTrendingUp class="text-green-600 dark:text-green-400" size={20} />
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    Quarterly Plan
                  </h3>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price (USD)
                    </label>
                    <div class="relative">
                      <FiDollarSign class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        min="2.99"
                        max="299.99"
                        value={pricing().quarterlyPrice}
                        onInput={(e) => updatePrice("quarterlyPrice", parseFloat(e.currentTarget.value) || 0)}
                        class={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors().quarterlyPrice 
                            ? "border-red-300 dark:border-red-600" 
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    </div>
                    <Show when={validationErrors().quarterlyPrice}>
                      <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors().quarterlyPrice}
                      </p>
                    </Show>
                  </div>

                  <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(pricing().quarterlyPrice)}
                    </div>
                    <div class="text-sm text-green-700 dark:text-green-300">
                      per 3 months
                    </div>
                    <Show when={pricing().quarterlyPrice < pricing().monthlyPrice * 3}>
                      <div class="text-xs text-green-600 dark:text-green-400 mt-1">
                        Save {formatCurrency(calculateSavings(pricing().monthlyPrice, pricing().quarterlyPrice, 3).amount)} 
                        ({calculateSavings(pricing().monthlyPrice, pricing().quarterlyPrice, 3).percentage.toFixed(0)}% off)
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>

            {/* Yearly */}
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center gap-2 mb-4">
                  <FiDollarSign class="text-purple-600 dark:text-purple-400" size={20} />
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    Yearly Plan
                  </h3>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price (USD)
                    </label>
                    <div class="relative">
                      <FiDollarSign class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        min="9.99"
                        max="999.99"
                        value={pricing().yearlyPrice}
                        onInput={(e) => updatePrice("yearlyPrice", parseFloat(e.currentTarget.value) || 0)}
                        class={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors().yearlyPrice 
                            ? "border-red-300 dark:border-red-600" 
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    </div>
                    <Show when={validationErrors().yearlyPrice}>
                      <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors().yearlyPrice}
                      </p>
                    </Show>
                  </div>

                  <div class="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(pricing().yearlyPrice)}
                    </div>
                    <div class="text-sm text-purple-700 dark:text-purple-300">
                      per year
                    </div>
                    <Show when={pricing().yearlyPrice < pricing().monthlyPrice * 12}>
                      <div class="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Save {formatCurrency(calculateSavings(pricing().monthlyPrice, pricing().yearlyPrice, 12).amount)} 
                        ({calculateSavings(pricing().monthlyPrice, pricing().yearlyPrice, 12).percentage.toFixed(0)}% off)
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price History */}
          <Show when={showHistory()}>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Recent Price Changes
                </h3>
                
                <Show when={priceHistory().length === 0}>
                  <p class="text-center text-gray-500 dark:text-gray-400 py-4">
                    No price changes recorded yet
                  </p>
                </Show>

                <Show when={priceHistory().length > 0}>
                  <div class="space-y-3">
                    <For each={priceHistory()}>
                      {(change) => (
                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div class="flex items-center gap-3">
                            <div class={`w-3 h-3 rounded-full ${
                              change.priceType === 'monthly' ? 'bg-blue-500' :
                              change.priceType === 'quarterly' ? 'bg-green-500' : 'bg-purple-500'
                            }`}></div>
                            <div>
                              <div class="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                {change.priceType} Plan
                              </div>
                              <div class="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(change.changedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          <div class="text-right">
                            <div class="text-sm text-gray-900 dark:text-white">
                              {formatCurrency(change.oldPrice)} → {formatCurrency(change.newPrice)}
                            </div>
                            <div class={`text-xs ${
                              change.newPrice > change.oldPrice 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {change.newPrice > change.oldPrice ? '+' : ''}
                              {formatCurrency(change.newPrice - change.oldPrice)}
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          {/* Pricing Guidelines */}
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Pricing Guidelines
            </h4>
            <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Longer subscription periods should offer better value per month</li>
              <li>• Price changes are tracked and logged for audit purposes</li>
              <li>• Changes take effect immediately on the live site</li>
              <li>• Consider market research and competitor pricing when setting rates</li>
              <li>• Existing subscribers are not affected by price changes until renewal</li>
            </ul>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default VipPricing;