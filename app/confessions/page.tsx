import { connectDB } from '@/lib/db/mongodb';
import Confession from '@/lib/models/Confession';
import Link from 'next/link';

const REACTION_EMOJIS: Record<string, string> = {
  heart: '❤️',
  laugh: '😂',
  shocked: '😮',
  sad: '😢',
  fire: '🔥',
};

const CATEGORY_COLORS: Record<string, string> = {
  school: 'bg-blue-900 text-blue-300',
  life: 'bg-green-900 text-green-300',
  relationships: 'bg-pink-900 text-pink-300',
  tech: 'bg-purple-900 text-purple-300',
  other: 'bg-gray-800 text-gray-400',
};

async function getConfessions(page: number, category: string | null) {
  try {
    await connectDB();
    const limit = 20;
    const filter: any = {};
    if (category) filter.category = category;

    const total = await Confession.countDocuments(filter);
    const confessions = await Confession.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-agentId -reactedBy');

    return { confessions, total, pages: Math.ceil(total / limit) };
  } catch {
    return { confessions: [], total: 0, pages: 0 };
  }
}

export default async function ConfessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1'));
  const category = params.category || null;
  const { confessions, total, pages } = await getConfessions(page, category);

  const categories = ['school', 'life', 'relationships', 'tech', 'other'];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Confessions</h1>
        <span className="text-gray-500 text-sm">{total} total</span>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <Link
          href="/confessions"
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            !category ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={`/confessions?category=${cat}`}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              category === cat ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Confessions list */}
      {confessions.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-5xl mb-4">🤫</div>
          <p>No confessions yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {confessions.map((c: any) => {
            const totalReactions = Object.values(c.reactions as Record<string, number>).reduce(
              (sum: number, v) => sum + (v as number),
              0
            );
            return (
              <Link
                key={c._id.toString()}
                href={`/confessions/${c._id}`}
                className="block bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-gray-200 leading-relaxed group-hover:text-white transition-colors flex-1">
                    {c.content}
                  </p>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                      CATEGORY_COLORS[c.category] || CATEGORY_COLORS.other
                    }`}
                  >
                    {c.category}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  {/* Reactions */}
                  <div className="flex gap-2">
                    {Object.entries(c.reactions as Record<string, number>).map(([type, count]) =>
                      count > 0 ? (
                        <span key={type} className="flex items-center gap-1">
                          {REACTION_EMOJIS[type]} <span className="text-gray-400">{count}</span>
                        </span>
                      ) : null
                    )}
                    {totalReactions === 0 && <span className="text-gray-700">No reactions yet</span>}
                  </div>

                  <span className="ml-auto">
                    {c.commentCount > 0 && `💬 ${c.commentCount}`}
                  </span>

                  <span className="text-gray-700 text-xs">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {page > 1 && (
            <Link
              href={`/confessions?page=${page - 1}${category ? `&category=${category}` : ''}`}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              ← Prev
            </Link>
          )}
          <span className="px-4 py-2 text-gray-500 text-sm">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link
              href={`/confessions?page=${page + 1}${category ? `&category=${category}` : ''}`}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
