export async function POST(req: Request) {
  const { query } = await req.json();
  const API_KEY = "716c7166fac9e9300521e692859a56a38eb10c7ed49ac934a1bd8c534b880929";

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=youtube&search_query=${encodeURIComponent(query)}&api_key=${API_KEY}`
    );

    const data = await response.json();
    // Transform the video results to match our interface
    const transformedResults = data.video_results?.map((video: any) => ({
      title: video.title,
      thumbnail: {
        static: video.thumbnail.static || video.thumbnail
      },
      link: video.link,
      channel: {
        name: video.channel.name
      },
      views: video.views || 0
    })) || [];

    return Response.json(transformedResults);
  } catch (error) {
    console.error("YouTube search error:", error);
    return new Response(
      JSON.stringify({ error: "Error searching YouTube" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 