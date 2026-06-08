import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  const { data: todos } = await supabase.from("todos").select();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-8 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Supabase Integration Test</h1>
      {todos && todos.length > 0 ? (
        <ul className="list-disc pl-5">
          {todos.map((todo: any) => (
            <li key={todo.id} className="py-1">
              {todo.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-500">No todos found or table does not exist yet.</p>
      )}
    </div>
  );
}
