import React, { useState, useEffect } from 'react';
import { ThumbsUp, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';
import { type RecommendedPriority } from '../types';

interface AIRecommendationsProps {
  date: string;
  onAccept: (name: string, importance: number) => void;
  isFuture: boolean;
}

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({ date, onAccept, isFuture }) => {
  const [recommendations, setRecommendations] = useState<RecommendedPriority[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isExpanded]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    setDismissedIndices(new Set());
    
    try {
      const data = await api.getRecommendations(date);
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError('Δεν ήταν δυνατή η φόρτωση προτάσεων. Βεβαιωθείτε ότι έχει ρυθμιστεί το OpenAI API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (recommendation: RecommendedPriority, index: number) => {
    onAccept(recommendation.name, recommendation.suggestedImportance);
    const newDismissed = new Set(dismissedIndices);
    newDismissed.add(index);
    setDismissedIndices(newDismissed);
  };

  const handleDismiss = (index: number) => {
    const newDismissed = new Set(dismissedIndices);
    newDismissed.add(index);
    setDismissedIndices(newDismissed);
  };

  const visibleRecommendations = recommendations.filter((_, index) => !dismissedIndices.has(index));

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getImportanceLabel = (importance: number) => {
    switch (importance) {
      case 1: return '🎯 Προτεραιότητα #1';
      case 2: return '✓ Προτεραιότητα #2';
      case 3: return '✓ Προτεραιότητα #3';
      default: return `Προτεραιότητα #${importance}`;
    }
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-violet-100/50 transition-colors rounded-xl"
      >
        <div className="flex items-center">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-violet-600 mr-2" /> : <ChevronDown className="w-5 h-5 text-violet-600 mr-2" />}
          <div className="text-left">
            <h2 className="text-xl font-bold text-violet-900">✨ Προτάσεις AI</h2>
            <p className="text-sm text-violet-700">Βασισμένες στο ιστορικό σας</p>
          </div>
        </div>
        <span className="text-sm text-violet-600">{isExpanded ? 'Κλείσιμο' : 'Άνοιγμα'}</span>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mr-2" />
              <p className="text-violet-700 font-medium">Δημιουργία προτάσεων με AI...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          ) : visibleRecommendations.length === 0 ? (
            <p className="text-center text-violet-600 py-4">Δεν υπάρχουν διαθέσιμες προτάσεις</p>
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <button
                  onClick={loadRecommendations}
                  className="px-3 py-1 text-sm bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                >
                  Ανανέωση
                </button>
              </div>
              <div className="space-y-3">
        {visibleRecommendations.map((rec) => (
          <div
            key={recommendations.indexOf(rec)}
            className="bg-white border border-violet-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-semibold text-violet-600">
                    {getImportanceLabel(rec.suggestedImportance)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConfidenceColor(rec.confidence)}`}>
                    {Math.round(rec.confidence * 100)}% εμπιστοσύνη
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{rec.name}</h3>
                <p className="text-sm text-gray-600">{rec.reason}</p>
              </div>
              <div className="flex items-center space-x-1 ml-3">
                <button
                  onClick={() => handleAccept(rec, recommendations.indexOf(rec))}
                  className="p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  title="Αποδοχή πρότασης"
                  disabled={isFuture}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDismiss(recommendations.indexOf(rec))}
                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Απόρριψη πρότασης"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

              <p className="text-xs text-violet-600 mt-3">
                💡 Οι προτάσεις ανανεώνονται κάθε 10 λεπτά με βάση το πρόσφατο ιστορικό σας
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
