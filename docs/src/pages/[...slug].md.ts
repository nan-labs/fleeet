// Serve raw markdown for each content page
import { getCollection, type CollectionEntry } from 'astro:content';

export async function getStaticPaths() {
  const docs = await getCollection('docs');
  
  return docs.map((entry: CollectionEntry<'docs'>) => {
    // Use the full entry.id as the slug (includes subdirectories like agents/claude-code)
    const slug = entry.id.replace(/\.md$/, '');
    return {
      params: { slug },
      props: { entry },
    };
  });
}

export async function GET({ props }: { props: { entry: CollectionEntry<'docs'> } }) {
  const { entry } = props;
  const { body } = entry;
  
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
