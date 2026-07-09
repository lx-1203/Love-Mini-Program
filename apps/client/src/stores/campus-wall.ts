import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface WallPost {
  id: string;
  avatar: string;
  nickname: string;
  school: string;
  grade: string;
  content: string;
  images: string[];
  location: string;
  topic: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isFollowing: boolean;
  createdAt: string;
}

export const useCampusWallStore = defineStore("campus-wall", () => {
  const posts = ref<WallPost[]>([
    {
      id: "1",
      avatar: "/static/assets/images/avatars/avatar-1.jpg",
      nickname: "小明",
      school: "北京大学",
      grade: "大三",
      content: "今天在图书馆看到一本好书，推荐给大家！《百年孤独》真的太震撼了",
      images: [
        "/static/assets/images/posts/campus-library.jpg",
        "/static/assets/images/activities/activity-1.jpg",
      ],
      location: "图书馆",
      topic: "读书分享",
      likes: 23,
      comments: 5,
      isLiked: false,
      isFollowing: false,
      createdAt: "2026-05-27T10:00:00Z",
    },
    {
      id: "2",
      avatar: "/static/assets/images/avatars/avatar-2.jpg",
      nickname: "小红",
      school: "清华大学",
      grade: "大二",
      content: "有人一起上晚自习吗？求组队！可以互相监督，提高效率",
      images: [],
      location: "教学楼",
      topic: "学习组队",
      likes: 15,
      comments: 8,
      isLiked: true,
      isFollowing: true,
      createdAt: "2026-05-27T09:00:00Z",
    },
    {
      id: "3",
      avatar: "/static/assets/images/avatars/avatar-3.jpg",
      nickname: "阿杰",
      school: "复旦大学",
      grade: "大四",
      content: "毕业季了，整理了一些考研资料，有需要的同学可以联系我",
      images: [
        "/static/assets/images/posts/campus-library.jpg",
        "/static/assets/images/activities/activity-study.jpg",
      ],
      location: "宿舍",
      topic: "考研资料",
      likes: 56,
      comments: 12,
      isLiked: false,
      isFollowing: false,
      createdAt: "2026-05-26T18:00:00Z",
    },
  ]);

  const loading = ref(false);

  // 切换点赞
  function toggleLike(postId: string) {
    const post = posts.value.find((p) => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
    }
  }

  // 切换关注
  function toggleFollow(postId: string) {
    const post = posts.value.find((p) => p.id === postId);
    if (post) {
      post.isFollowing = !post.isFollowing;
    }
  }

  // 发布帖子
  function addPost(post: Omit<WallPost, "id" | "likes" | "comments" | "isLiked" | "isFollowing" | "createdAt">) {
    const newPost: WallPost = {
      ...post,
      id: String(Date.now()),
      likes: 0,
      comments: 0,
      isLiked: false,
      isFollowing: false,
      createdAt: new Date().toISOString(),
    };
    posts.value.unshift(newPost);
  }

  return {
    posts,
    loading,
    toggleLike,
    toggleFollow,
    addPost,
  };
});
