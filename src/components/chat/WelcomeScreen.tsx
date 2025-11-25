interface WelcomeScreenProps {
  onActionClick: (prompt: string) => void;
}

export function WelcomeScreen({ onActionClick }: WelcomeScreenProps) {
  const examplePrompts = [
    "Create 5 Instagram posts about our new product",
    "Generate a marketing video for TikTok",
    "Plan my content calendar for next week",
    "Write a blog post about sustainability",
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-6">
      <div className="space-y-12 text-center">
        {/* Simple Title - Minimal */}
        <div className="space-y-3 pt-8">
          <h1 className="text-4xl font-normal text-foreground/90">
            Hello
          </h1>
          <p className="text-base text-muted-foreground/60 font-light">
            How can I help you today?
          </p>
        </div>

        {/* Simple Example Prompts - No Cards */}
        <div className="space-y-4 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onActionClick(prompt)}
                className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 transition-all text-left"
              >
                <p className="text-sm text-foreground/80">
                  {prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
