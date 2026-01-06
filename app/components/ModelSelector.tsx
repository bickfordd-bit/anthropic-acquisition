"use client";

import { useEffect, useState } from "react";

type ModelProvider = "claude" | "gpt" | "auto";

interface ModelStatus {
  provider: ModelProvider;
  available: boolean;
}

export default function ModelSelector() {
  const [selectedModel, setSelectedModel] = useState<ModelProvider>("auto");
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("bickford-model-preference");
    if (saved && ["claude", "gpt", "auto"].includes(saved)) {
      setSelectedModel(saved as ModelProvider);
    }

    // Check model availability
    checkModelAvailability();
  }, []);

  // Save preference to localStorage when changed
  useEffect(() => {
    localStorage.setItem("bickford-model-preference", selectedModel);
  }, [selectedModel]);

  const checkModelAvailability = async () => {
    // Model availability is determined server-side based on API keys
    // We default to assuming models are available unless explicitly known otherwise
    // In production, you could add an API endpoint to check this server-side
    setModelStatuses([
      { provider: "claude", available: true },
      { provider: "gpt", available: true },
    ]);
  };

  const getModelIcon = (provider: ModelProvider) => {
    switch (provider) {
      case "claude":
        return "🧠";
      case "gpt":
        return "⚡";
      case "auto":
        return "🎯";
      default:
        return "🤖";
    }
  };

  const getModelLabel = (provider: ModelProvider) => {
    switch (provider) {
      case "claude":
        return "Claude Sonnet";
      case "gpt":
        return "GPT-4 Turbo";
      case "auto":
        return "Auto-Select";
      default:
        return "Unknown";
    }
  };

  const getModelDescription = (provider: ModelProvider) => {
    switch (provider) {
      case "claude":
        return "Best for reasoning & planning";
      case "gpt":
        return "Fast code generation";
      case "auto":
        return "Intelligent task routing";
      default:
        return "";
    }
  };

  const isAvailable = (provider: ModelProvider) => {
    if (provider === "auto") return true;
    const status = modelStatuses.find((s) => s.provider === provider);
    return status?.available !== false; // Default to true
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 transition-colors"
        aria-label="Select AI model"
      >
        <span className="text-lg">{getModelIcon(selectedModel)}</span>
        <span className="hidden sm:inline">{getModelLabel(selectedModel)}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg">
            <div className="p-2 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">
                AI Model Selection
              </h3>
              <p className="text-xs text-zinc-600 mt-0.5">
                Choose your preferred model
              </p>
            </div>

            <div className="p-2 space-y-1">
              {(["auto", "claude", "gpt"] as ModelProvider[]).map((provider) => {
                const available = isAvailable(provider);
                const selected = selectedModel === provider;

                return (
                  <button
                    key={provider}
                    onClick={() => {
                      if (available) {
                        setSelectedModel(provider);
                        setIsOpen(false);
                      }
                    }}
                    disabled={!available}
                    className={`w-full flex items-start gap-3 rounded-md p-3 text-left transition-colors ${
                      selected
                        ? "bg-blue-50 border-2 border-blue-500"
                        : available
                        ? "hover:bg-zinc-50 border-2 border-transparent"
                        : "opacity-50 cursor-not-allowed border-2 border-transparent"
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">
                      {getModelIcon(provider)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-900">
                          {getModelLabel(provider)}
                        </span>
                        {selected && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Active
                          </span>
                        )}
                        {!available && provider !== "auto" && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {getModelDescription(provider)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-zinc-200 bg-zinc-50">
              <p className="text-xs text-zinc-600">
                <strong>Auto-Select</strong> chooses the best model for each task.
                Model availability depends on configured API keys.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
