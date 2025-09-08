import { Component, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { feedbackService } from "../services/supabase/feedbackService";
import SEOHead from "../components/seo/SEOHead";

const Feedback: Component = () => {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [feedback, setFeedback] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isSubmitted, setIsSubmitted] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await feedbackService.submitFeedback({
        email: email().trim() || undefined,
        feedback_text: feedback().trim()
      });

      setIsSubmitted(true);
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setErrorMessage("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate("/");
  };

  return (
    <>
      <SEOHead 
        title="ChatWii"
        description="Share your feedback and help us improve ChatWii."
      />
      
      <div class="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-8">
        {/* Header */}
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            We'd Love Your Feedback!
          </h1>
          <p class="text-gray-600 dark:text-gray-300">
            Help us improve ChatWii for everyone
          </p>
        </div>

        {/* Success Message */}
        {isSubmitted() && (
          <div class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
                  Thank you for your feedback!
                </h3>
                <p class="text-sm text-green-700 dark:text-green-300 mt-1">
                  We appreciate your input and will review it soon. Redirecting you home...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage() && (
          <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-red-800 dark:text-red-200">
                {errorMessage()}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} class="space-y-6" classList={{ "opacity-50 pointer-events-none": isSubmitted() }}>
          {/* Email Field */}
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address (Optional)
            </label>
            <input
              type="email"
              id="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="your@email.com"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          </div>

          {/* Feedback Field */}
          <div>
            <label for="feedback" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Feedback
            </label>
            <textarea
              id="feedback"
              value={feedback()}
              onInput={(e) => setFeedback(e.currentTarget.value)}
              placeholder="Tell us about your experience, suggestions for improvement, or any issues you encountered..."
              rows="5"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
            />
          </div>

          {/* Buttons */}
          <div class="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={isSubmitting() || feedback().trim() === ""}
              class="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isSubmitting() ? (
                <span class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Feedback"
              )}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              class="w-full px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium rounded-lg transition-colors duration-200"
            >
              Skip and Go Home
            </button>
          </div>
        </form>

        {/* Footer */}
        <div class="mt-8 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Your feedback helps us make ChatWii better for everyone!
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default Feedback;