// In your page file, e.g., app/comic/story/page.tsx or app/comic/result/page.tsx

import ComicPanel from '../../components/ComicPanel'; // Adjust the path as needed

export default function StoryPage() {
  return (
    <main>
      <ComicPanel
        imageUrl="/my-comic-panel-1.png"
        caption="Climax: Triumph with Friendship"
        initialBubbles={[
          { id: 1, text: "I must be strong!", x: "20%", y: "18%" },
          { id: 2, text: "You can do it!", x: "70%", y: "70%" }
        ]}
      />
    </main>
  );
}
