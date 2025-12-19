import { FrameworkForm } from '@/components/frameworks/framework-form';

export default function NewFrameworkPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Framework</h1>
        <p className="text-muted-foreground">
          Define a new review framework with check categories
        </p>
      </div>

      <FrameworkForm mode="create" />
    </div>
  );
}
