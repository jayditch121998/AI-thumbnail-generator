import ImageEditor from "./components/ImageEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">AI Image Editor</h1>
        <ImageEditor />
      </div>
    </main>
  );
}
