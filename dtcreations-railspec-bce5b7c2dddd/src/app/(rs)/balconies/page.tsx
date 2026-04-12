// NO "use client" here

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const resolved = await params; // 👈 this is the key

  console.log("🔍 [test-dynamic/[slug]] resolved params:", resolved);

  return (
    <main style={{ padding: 16 }}>
      <h1>Test Dynamic Route</h1>
      <pre>{JSON.stringify({ params: resolved, keys: Object.keys(resolved) }, null, 2)}</pre>
    </main>
  );
}
