interface Props {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold md:text-2xl">{title}</h1>
        {description && <p className="text-sm text-base-content/70">{description}</p>}
      </div>
      <div className="hero rounded-box bg-base-100 shadow">
        <div className="hero-content py-16 text-center">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold">Розділ у розробці</h2>
            <p className="mt-2 text-sm text-base-content/70">
              Реалізується згідно дорожньої карти. Слідкуйте за оновленнями.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
