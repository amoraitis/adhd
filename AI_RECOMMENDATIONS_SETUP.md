# AI Recommendations Feature - Setup Guide

## Overview
The AI Recommendations feature uses OpenAI GPT-4o-mini to analyze your historical priorities and suggest intelligent recommendations for upcoming days. Recommendations are cached in-memory for 10 minutes to minimize API costs.

## Features
- Analyzes your last 14 days of priorities
- Considers day of week patterns (weekdays vs weekends)
- Identifies recurring tasks and uncompleted priorities
- Provides confidence scores for each recommendation
- Suggests importance level (1-3) for each priority
- 10-minute in-memory caching to reduce API calls
- User-friendly UI to accept or dismiss recommendations

## Configuration

### 1. Set up OpenAI API Key

You need to configure your OpenAI API key using .NET User Secrets for security:

```powershell
# Navigate to the API project directory
cd e:\source\adhd\api

# Initialize user secrets (if not already done)
dotnet user-secrets init

# Set your OpenAI API key
dotnet user-secrets set "OpenAI:ApiKey" "sk-your-actual-api-key-here"
```

To get an OpenAI API key:
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and use it in the command above

### 2. OpenAI Configuration

The following settings are already configured in `appsettings.json`:

```json
{
  "OpenAI": {
    "ApiKey": "",  // Set via user secrets (see above)
    "Model": "gpt-4o-mini",
    "MaxTokens": 500,
    "Temperature": 0.7
  }
}
```

You can adjust these settings if needed:
- **Model**: "gpt-4o-mini" is cost-effective. You can use "gpt-4" or "gpt-3.5-turbo" if desired
- **MaxTokens**: Limits response length (500 is sufficient for 3 recommendations)
- **Temperature**: 0.7 provides creative but reasonable suggestions (range: 0.0 to 1.0)

### 3. Verify Configuration

After setting up the API key, restart your API server and check the logs for any errors:

```powershell
# Stop the current API (Ctrl+C if running)
# Start the API again
cd e:\source\adhd\api
dotnet run
```

If the API key is not configured, you'll see a warning in the logs:
```
OpenAI API key not configured. Recommendations will not be available.
```

## Usage

### In the Web Client

1. Open the Daily Tracker for today or any future date
2. The "AI Recommendations" section appears below recurring priorities
3. Click the sparkle icon to view recommendations
4. Each recommendation shows:
   - Priority name and suggested importance (#1, #2, or #3)
   - Reason for the recommendation
   - Confidence score (0-100%)
5. Click the thumbs-up icon to accept a recommendation (fills that priority slot)
6. Click the X icon to dismiss a recommendation
7. Click "Refresh" to get new recommendations (respects 10-minute cache)

### API Endpoint

You can also call the recommendations endpoint directly:

```bash
GET http://localhost:5180/api/recommendations/{date}
# Example: GET http://localhost:5180/api/recommendations/2025-06-15
```

Response format:
```json
[
  {
    "name": "Review work presentation",
    "reason": "You typically prepare presentations on Mondays based on your history",
    "suggestedImportance": 1,
    "confidence": 0.85
  },
  {
    "name": "Grocery shopping",
    "reason": "This appears weekly in your priorities",
    "suggestedImportance": 2,
    "confidence": 0.75
  },
  {
    "name": "Exercise routine",
    "reason": "Uncompleted from yesterday and appears frequently",
    "suggestedImportance": 3,
    "confidence": 0.65
  }
]
```

## Caching Behavior

- Recommendations are cached **per date** for **10 minutes**
- Cache key format: `priority-recommendations-{date}`
- After 10 minutes, the next request will call OpenAI API and refresh the cache
- This minimizes costs while keeping recommendations reasonably fresh
- You can manually refresh by clicking "Refresh" in the UI

## Cost Considerations

- **Model**: gpt-4o-mini is the most cost-effective option
- **Caching**: 10-minute cache dramatically reduces API calls
- **Token usage**: ~500 tokens per request (including historical context)
- **Typical cost**: Less than $0.01 per request with gpt-4o-mini
- **Estimated monthly cost**: $1-5 for regular daily use

## Troubleshooting

### No recommendations appear
- Check that OpenAI API key is configured (see section 1)
- Verify you have at least 7 days of historical priorities
- Check browser console for errors
- Check API logs for OpenAI errors

### API key errors
```
Error: Incorrect API key provided
```
- Verify your API key is correct
- Ensure it starts with "sk-"
- Check that you've set it in user secrets, not appsettings.json

### Rate limit errors
```
Error: Rate limit exceeded
```
- OpenAI has rate limits based on your plan
- The 10-minute cache helps prevent this
- Consider upgrading your OpenAI plan if needed

### Empty recommendations
```
[]
```
- Need at least 7 days of historical data
- Check that you have priorities recorded in previous days
- The AI may return fewer than 3 recommendations if insufficient data

## Architecture

### Backend Components

1. **Models/RecommendedPriority.cs**: Data model for AI recommendations
2. **Services/IPriorityRecommendationService.cs**: Service interface
3. **Services/PriorityRecommendationService.cs**: Core implementation
   - Fetches last 14 days of priorities from database
   - Builds context string with historical patterns
   - Calls OpenAI Chat Completion API
   - Parses JSON response into recommendations
   - Implements 10-minute in-memory caching with IMemoryCache
4. **Extensions/EndpointExtensions.Recommendations.cs**: API endpoint

### Frontend Components

1. **types.ts**: TypeScript interface for RecommendedPriority
2. **api.ts**: API client method for fetching recommendations
3. **components/AIRecommendations.tsx**: UI component
   - Displays recommendations with accept/dismiss actions
   - Shows confidence scores and importance levels
   - Handles loading and error states
4. **components/DailyTracker.tsx**: Integrates AI recommendations

### Dependencies

- **Backend**: OpenAI SDK 2.7.0, Microsoft.Extensions.Caching.Memory (built-in)
- **Frontend**: React, TypeScript, Lucide icons

## Future Enhancements

Potential improvements for the recommendation system:
- Adjust cache duration based on time of day
- Allow users to configure AI model and parameters
- Add feedback mechanism to improve recommendations over time
- Support multiple recommendation "modes" (aggressive, balanced, conservative)
- Include goal progress in recommendation context
- Add option to regenerate recommendations with different parameters
