import { defineStore } from "pinia";
// 修复（严格模式 noUnusedLocals）：computed 未在 store 内使用，仅保留 ref。
import { ref } from "vue";
// 统一图片资源路径常量，避免在 store 中硬编码字符串
import { IMAGE_PATHS } from "@/config/images";

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

/** 演示帖的初始形态（登出复位与 store 初始化共用一份，避免两处各写一份种子数据） */
function seedPosts(): WallPost[] {
  return [
    {
      id: "1",
      avatar: IMAGE_PATHS.AVATARS.AVATAR_1,
      nickname: "小明",
      school: "北京大学",
      grade: "大三",
      content: "今天在图书馆看到一本好书，推荐给大家！《百年孤独》真的太震撼了",
      images: [
        IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
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
      avatar: IMAGE_PATHS.AVATARS.AVATAR_2,
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
      avatar: IMAGE_PATHS.AVATARS.AVATAR_3,
      nickname: "阿杰",
      school: "复旦大学",
      grade: "大四",
      content: "毕业季了，整理了一些考研资料，有需要的同学可以联系我",
      images: [
        IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
        IMAGE_PATHS.ACTIVITIES.ACTIVITY_STUDY,
      ],
      location: "宿舍",
      topic: "考研资料",
      likes: 56,
      comments: 12,
      isLiked: false,
      isFollowing: false,
      createdAt: "2026-05-26T18:00:00Z",
    },
  ];
}

export const useCampusWallStore = defineStore("campus-wall", () => {
  const posts = ref<WallPost[]>(seedPosts());

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

  /**
   * 登出清理（第五轮 FINDING 15）：`isLiked` / `isFollowing` 是「这个账号点过没有」的
   * 账号态，留在内存里下一个账号会看到上一个账号的点赞与关注标记（计数也随之偏）。
   * 演示种子由 `seedPosts()` 单点提供，复位与初始化走同一份。
   */
  function resetForLogout(): void {
    posts.value = seedPosts();
    loading.value = false;
  }

  return {
    posts,
    loading,
    toggleLike,
    toggleFollow,
    addPost,
    resetForLogout,
  };
});
