// ==================== 工具函数 ====================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const appState = {
  user: null,
  isLogin: false,
  currentPage: "feed"
};

function toast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function timeAgo(dt) {
  const now = Date.now();
  const diff = now - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  return `${Math.floor(hrs / 24)}天前`;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function avatarFallback(name, cls = "avatar") {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = name ? name.charAt(0).toUpperCase() : "?";
  return el;
}

function avatarImg(url, name, cls = "avatar") {
  if (url) {
    const img = document.createElement("img");
    img.className = cls;
    img.src = url;
    img.onerror = function () {
      this.replaceWith(avatarFallback(name, cls));
    };
    return img;
  }
  return avatarFallback(name, cls);
}

// ==================== API（保持不变） ====================
// 这里保持你原有的 api 对象，不做任何修改
// api 对象应该在你的其他文件中定义

// ==================== 认证模块 ====================
const AuthModule = {
  isRegisterMode: false,

  init() {
    document.getElementById("toggleAuthMode").addEventListener("click", () => this.toggleMode());
    $("#authForm").addEventListener("submit", (e) => this.handleSubmit(e));
  },

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    
    $("#authTitle").textContent = this.isRegisterMode ? "注册" : "登录";
    $("#authSubtitle").textContent = this.isRegisterMode 
      ? "加入校园交友平台" : "欢迎回到校园交友平台";
    $("#authSubmitBtn").textContent = this.isRegisterMode ? "注册" : "登录";
    $("#usernameGroup").style.display = this.isRegisterMode ? "block" : "none";
    $("#confirmGroup").style.display = this.isRegisterMode ? "block" : "none";
    $("#authToggle").innerHTML = this.isRegisterMode
      ? '已有账号？<a id="toggleAuthMode">立即登录</a>'
      : '还没有账号？<a id="toggleAuthMode">立即注册</a>';
    $("#authError").textContent = "";
    
    document.getElementById("toggleAuthMode").addEventListener("click", () => this.toggleMode());
  },

  async handleSubmit(e) {
    e.preventDefault();
    
    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value.trim();
    const errorEl = $("#authError");

    if (!email || !password) {
      errorEl.textContent = "请填写完整信息";
      return;
    }

    if (this.isRegisterMode) {
      await this.handleRegister(email, password, errorEl);
    } else {
      await this.handleLogin(email, password, errorEl);
    }
  },

  async handleRegister(email, password, errorEl) {
    const username = $("#authUsername").value.trim();
    const confirm = $("#authConfirmPassword").value.trim();

    if (!username) {
      errorEl.textContent = "请输入用户名";
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = "两次密码不一致";
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "密码至少6位";
      return;
    }

    const res = await api.register({ username, email, password });
    if (res.code !== 0) {
      errorEl.textContent = res.msg;
      return;
    }

    toast("注册成功，请登录");
    this.toggleMode();
  },

  async handleLogin(email, password, errorEl) {
    const res = await api.login({ email, password });
    if (res.code !== 0) {
      errorEl.textContent = res.msg;
      return;
    }

    api.setToken(res.data.access_token);
    localStorage.setItem("token", res.data.access_token);
    await AppModule.load();
  }
};

// ==================== 导航模块 ====================
const NavigationModule = {
  setup() {
    $$(".sidebar-nav a[data-page]").forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        this.navigateTo(link.dataset.page);
      };
    });
  },

  setupLogout() {
    $("#logoutBtn").onclick = () => {
      localStorage.removeItem("token");
      api.setToken(null);
      
      appState.isLogin = false;
      appState.user = null;

      $("#appLayout").style.display = "none";
      $("#authOverlay").style.display = "flex";

      if (AuthModule.isRegisterMode) AuthModule.toggleMode();
      $("#authError").textContent = "";
    };
  },

  navigateTo(page) {
    appState.currentPage = page;

    // 更新导航激活状态
    $$(".sidebar-nav a").forEach(a => a.classList.remove("active"));
    $(`.sidebar-nav a[data-page="${page}"]`)?.classList.add("active");

    // 切换页面显示
    $$(".page").forEach(p => p.classList.remove("active"));
    $(`#page-${page}`)?.classList.add("active");

    // 加载对应页面内容
    const pageHandlers = {
      feed: () => FeedModule.load(),
      recommend: () => RecommendModule.load(),
      friends: () => FriendsModule.load(),
      favorites: () => FavoritesModule.load(),
      profile: () => ProfileModule.load()
    };

    if (pageHandlers[page]) {
      pageHandlers[page]();
    }
  }
};

// ==================== 帖子工具函数 ====================
const PostUtils = {
  createImagesHTML(images) {
    if (!images || !images.length) return "";
    
    return `
      <div class="post-images" style="margin-bottom: 14px;">
        ${images.map(img => `<img src="${img}" alt="">`).join("")}
      </div>`;
  },

  createPostHTML(post) {
    return `
      <div class="feed-item" data-post-id="${post.id}">
        <div class="feed-header">
          ${avatarImg(post.avatar_url, post.username, "feed-avatar").outerHTML}
          <div class="feed-user-info">
            <div class="feed-username">${esc(post.username)}</div>
            <div class="feed-time">${timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div class="feed-body">${esc(post.content)}</div>
        ${this.createImagesHTML(post.images)}
        <div class="feed-actions-row">
          <button class="feed-action-btn ${post.is_liked ? "liked" : ""}" 
                  data-action="like" data-post-id="${post.id}">
            ${post.is_liked ? "❤️" : "🤍"} <span>${post.like_count || 0}</span>
          </button>
          <button class="feed-action-btn ${post.is_favorited ? "favorited" : ""}" 
                  data-action="favorite" data-post-id="${post.id}">
            ${post.is_favorited ? "⭐ 已收藏" : "☆ 收藏"}
          </button>
          <button class="feed-action-btn" data-action="comment" data-post-id="${post.id}">
            💬 <span>${post.comment_count || 0}</span>
          </button>
          <button class="feed-action-btn" data-action="detail" data-post-id="${post.id}">
            📋 详情
          </button>
        </div>
        <div class="comment-section" id="comments-${post.id}" style="display:none"></div>
      </div>`;
  }
};

// ==================== 帖子事件处理模块 ====================
const PostEventsModule = {
  init() {
    this.initLikeButtons();
    this.initFavoriteButtons();
    this.initCommentButtons();
    this.initDetailButtons();
  },

  initLikeButtons() {
    $$("[data-action='like']").forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.postId;
        const res = await api.likePost(pid);
        
        if (res.code !== 0) {
          toast(res.msg, "error");
          return;
        }
        
        btn.classList.toggle("liked", res.data.liked);
        btn.innerHTML = `${res.data.liked ? "❤️" : "🤍"} <span>${res.data.like_count}</span>`;
      };
    });
  },

  initFavoriteButtons() {
    $$("[data-action='favorite']").forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.postId;
        const isFavorited = btn.classList.contains("favorited");
        const res = isFavorited ? await api.unfavoritePost(pid) : await api.favoritePost(pid);

        if (res.code !== 0) {
          toast(res.msg, "error");
          return;
        }

        if (isFavorited && appState.currentPage === "favorites") {
          toast("已取消收藏");
          FavoritesModule.load();
          return;
        }

        btn.classList.toggle("favorited", !isFavorited);
        btn.innerHTML = !isFavorited ? "⭐ 已收藏" : "☆ 收藏";
        toast(!isFavorited ? "收藏成功" : "已取消收藏");
      };
    });
  },

  initCommentButtons() {
    $$("[data-action='comment']").forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.postId;
        const section = $(`#comments-${pid}`);
        
        if (section.style.display === "block") {
          section.style.display = "none";
          return;
        }
        
        await CommentModule.loadComments(pid);
        section.style.display = "block";
      };
    });
  },

  initDetailButtons() {
    $$("[data-action='detail']").forEach(btn => {
      btn.onclick = () => PostDetailModule.show(parseInt(btn.dataset.postId));
    });
  }
};

// ==================== 评论模块 ====================
const CommentModule = {
  async loadComments(postId) {
    const section = $(`#comments-${postId}`);
    const res = await api.getComments(postId);
    if (res.code !== 0) return;

    section.innerHTML = this.renderCommentTree(res.data, postId) + `
      <div class="comment-reply-box">
        <input class="input" id="commentInput-${postId}" placeholder="写评论...">
        <button class="btn btn-primary btn-sm" data-submit-comment="${postId}">发送</button>
      </div>`;

    section.querySelector(`[data-submit-comment="${postId}"]`).onclick = () => 
      this.submitComment(postId, null);
  },

  renderCommentTree(comments, postId, depth = 0) {
    if (!comments || !comments.length) {
      return '<p style="font-size:13px;color:var(--text-secondary);padding:8px 0">暂无评论</p>';
    }

    return comments.map(c => {
      const cls = depth > 0 ? "comment-nested" : "";
      return `
        <div class="${cls}">
          <div class="comment-item">
            ${avatarImg(c.avatar_url, c.username, "avatar avatar-sm").outerHTML}
            <div class="comment-body">
              <span class="comment-username">${esc(c.username)}</span>
              <div class="comment-content">${esc(c.content)}</div>
              <span class="comment-time">${timeAgo(c.created_at)}</span>
              <button class="comment-reply-btn" data-reply="${c.id}" data-post="${postId}">回复</button>
              <div class="comment-reply-box" id="replyBox-${c.id}" style="display:none">
                <input class="input" id="replyInput-${c.id}" placeholder="回复 ${esc(c.username)}...">
                <button class="btn btn-primary btn-sm" data-submit-reply="${c.id}" data-post="${postId}">发送</button>
              </div>
            </div>
          </div>
          ${c.replies ? this.renderCommentTree(c.replies, postId, depth + 1) : ""}
        </div>
      `;
    }).join("") + this.initReplyButtons();
  },

  initReplyButtons() {
    setTimeout(() => {
      $$("[data-reply]").forEach(btn => {
        btn.onclick = () => {
          const box = $(`#replyBox-${btn.dataset.reply}`);
          box.style.display = box.style.display === "none" ? "flex" : "none";
        };
      });

      $$("[data-submit-reply]").forEach(btn => {
        btn.onclick = () => {
          const parentId = parseInt(btn.dataset.submitReply);
          const postId = parseInt(btn.dataset.post);
          this.submitComment(postId, parentId);
        };
      });
    }, 0);
    return "";
  },

  async submitComment(postId, parentId) {
    const inputId = parentId ? `replyInput-${parentId}` : `commentInput-${postId}`;
    const input = document.getElementById(inputId);
    const content = input.value.trim();
    if (!content) return;

    const data = { content };
    if (parentId) data.parent_id = parentId;

    const res = await api.addComment(postId, data);
    if (res.code !== 0) {
      toast(res.msg, "error");
      return;
    }

    toast("评论成功");
    await this.loadComments(postId);
    FeedModule.load();
  }
};

// ==================== 动态模块 ====================
const FeedModule = {
  feedSort: "latest",
  feedPage: 1,

  async load() {
    $("#feedList").innerHTML = '<div class="loading">加载中...</div>';
    this.feedPage = 1;

    const res = await api.getPosts(this.feedSort, this.feedPage);
    if (res.code !== 0) {
      $("#feedList").innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
      return;
    }

    this.renderPosts(res.data || []);
    this.setupComposer();
    PostEventsModule.init();
  },

  renderPosts(posts) {
    if (!posts.length) {
      $("#feedList").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无动态，快来发布第一条吧！</p>
        </div>`;
      return;
    }

    $("#feedList").innerHTML = posts.map(p => PostUtils.createPostHTML(p)).join("");
  },

  setupComposer() {
    const av = $("#composerAvatar");
    if (appState.user && appState.user.avatar_url) {
      av.innerHTML = "";
      av.appendChild(avatarImg(appState.user.avatar_url, appState.user.username));
    } else {
      av.textContent = appState.user?.username?.charAt(0)?.toUpperCase() || "?";
    }

    $("#publishBtn").onclick = async () => {
      const content = $("#postContent").value.trim();
      if (!content) {
        toast("请输入动态内容", "error");
        return;
      }

      const res = await api.createPost({ content, images: [] });
      if (res.code !== 0) {
        toast(res.msg, "error");
        return;
      }

      $("#postContent").value = "";
      toast("发布成功！");
      this.load();
    };
  }
};

// ==================== 收藏模块 ====================
const FavoritesModule = {
  async load() {
    const container = $("#favoritesList");
    if (!container) return;

    container.innerHTML = '<div class="loading">加载中...</div>';

    const res = await api.getFavorites();
    if (res.code !== 0) {
      container.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
      return;
    }

    const items = res.data?.items || [];
    if (!items.length) {
      container.innerHTML = '<div class="favorites-empty">你还没有收藏任何帖子</div>';
      return;
    }

    container.innerHTML = items.map(item => this.createFavoriteItemHTML(item)).join("");
    PostEventsModule.init();
  },

  createFavoriteItemHTML(item) {
    return `
      <div class="feed-item" data-post-id="${item.post_id}">
        <div class="feed-header">
          ${avatarImg(item.avatar_url, item.username, "feed-avatar").outerHTML}
          <div class="feed-user-info">
            <div class="feed-username">${esc(item.username)}</div>
            <div class="feed-time">收藏于 ${timeAgo(item.created_at)}</div>
          </div>
        </div>
        <div class="feed-body">${esc(item.content)}</div>
        ${PostUtils.createImagesHTML(item.images)}
        <div class="feed-actions-row">
          <button class="feed-action-btn favorited" data-action="favorite" data-post-id="${item.post_id}">
            ⭐ 已收藏
          </button>
          <button class="feed-action-btn" data-action="detail" data-post-id="${item.post_id}">
            📋 详情
          </button>
          <button class="feed-action-btn" disabled>
            ❤️ <span>${item.like_count || 0}</span>
          </button>
          <button class="feed-action-btn" disabled>
            💬 <span>${item.comment_count || 0}</span>
          </button>
        </div>
      </div>`;
  }
};

// ==================== 帖子详情模块 ====================
const PostDetailModule = {
  async show(postId) {
    const res = await api.getPost(postId);
    if (res.code !== 0) {
      toast(res.msg, "error");
      return;
    }
    const p = res.data;

    $("#feedList").innerHTML = `
      <button class="btn btn-outline btn-sm" id="backToFeed" style="margin-bottom: 16px;">← 返回动态列表</button>
      <div class="feed-item">
        <div class="feed-header">
          ${avatarImg(p.avatar_url, p.username, "feed-avatar").outerHTML}
          <div class="feed-user-info">
            <div class="feed-username">${esc(p.username)}</div>
            <div class="feed-time">${timeAgo(p.created_at)}</div>
          </div>
        </div>
        <div class="feed-body">${esc(p.content)}</div>
        ${PostUtils.createImagesHTML(p.images)}
        <div class="feed-actions-row">
          <button class="feed-action-btn ${p.is_liked ? "liked" : ""}" data-action="like" data-post-id="${p.id}">
            ${p.is_liked ? "❤️" : "🤍"} <span>${p.like_count || 0}</span>
          </button>
          <button class="feed-action-btn ${p.is_favorited ? "favorited" : ""}" data-action="favorite" data-post-id="${p.id}">
            ${p.is_favorited ? "⭐ 已收藏" : "☆ 收藏"}
          </button>
          <button class="feed-action-btn" disabled>
            👁 <span>${p.view_count || 0}</span>
          </button>
        </div>
        <div class="comment-section" id="comments-${p.id}" style="display:block"></div>
      </div>
    `;

    $("#backToFeed").onclick = () => FeedModule.load();
    PostEventsModule.init();
    await CommentModule.loadComments(postId);
  }
};

// ==================== 推荐模块 ====================
const RecommendModule = {
  async load() {
    $("#recommendList").innerHTML = '<div class="loading">正在为你匹配...</div>';

    const res = await api.getRecommend();
    if (res.code !== 0) {
      $("#recommendList").innerHTML = '<div class="empty-state"><p>暂无推荐</p></div>';
      return;
    }

    const list = res.data || [];
    if (!list.length) {
      $("#recommendList").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>暂时没有更多推荐，完善个人信息可获得更精准推荐哦</p>
        </div>`;
      return;
    }

    $("#recommendList").innerHTML = list.map(u => this.createRecommendCardHTML(u)).join("");
    this.bindAddFriendButtons();
  },

  createRecommendCardHTML(u) {
    return `
      <div class="recommend-card">
        ${avatarImg(u.avatar_url, u.username, "recommend-avatar").outerHTML}
        <div class="recommend-name">${esc(u.username)}</div>
        <div class="recommend-meta">${esc(u.campus || "未知校园")} · ${esc(u.major || "未知专业")}</div>
        <div class="recommend-interests">
          ${(u.interests || "").split(",").filter(Boolean).map(t => 
            `<span class="interest-tag">${esc(t.trim())}</span>`
          ).join("")}
        </div>
        <button class="btn-add-friend" data-add-friend="${u.id}">加好友</button>
      </div>`;
  },

  bindAddFriendButtons() {
    $$("[data-add-friend]").forEach(btn => {
      btn.onclick = async () => {
        const res = await api.requestFriend(parseInt(btn.dataset.addFriend));
        if (res.code !== 0) {
          toast(res.msg, "error");
          return;
        }
        btn.textContent = "已申请";
        btn.disabled = true;
        toast("好友申请已发送！");
      };
    });
  }
};

// ==================== 好友模块 ====================
const FriendsModule = {
  async load(tab = "list") {
    if (tab === "list") {
      await this.loadFriendList();
    } else {
      await this.loadPendingRequests();
    }

    $$("[data-friend-tab]").forEach(t => {
      t.classList.toggle("active", t.dataset.friendTab === tab);
      t.onclick = () => this.load(t.dataset.friendTab);
    });
  },

  async loadFriendList() {
    const res = await api.getFriends();
    if (res.code !== 0) return;

    const friends = res.data || [];
    if (!friends.length) {
      $("#friendListContent").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👋</div>
          <p>还没有好友，去交友推荐看看吧！</p>
        </div>`;
    } else {
      $("#friendListContent").innerHTML = friends.map(f => this.createFriendItemHTML(f)).join("");
    }
  },

  async loadPendingRequests() {
    const res = await api.getPending();
    if (res.code !== 0) return;

    const pending = res.data || [];
    if (!pending.length) {
      $("#friendListContent").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📨</div>
          <p>暂无待处理的好友申请</p>
        </div>`;
    } else {
      $("#friendListContent").innerHTML = pending.map(r => this.createPendingRequestHTML(r)).join("");
      this.bindPendingButtons();
    }
  },

  createFriendItemHTML(f) {
    return `
      <div class="friend-item">
        ${avatarImg(f.avatar_url, f.username, "friend-avatar").outerHTML}
        <div class="friend-info">
          <div class="friend-name">${esc(f.username)}</div>
          <div class="friend-email">${esc(f.campus || "")} ${esc(f.major || "")}</div>
        </div>
      </div>`;
  },

  createPendingRequestHTML(r) {
    return `
      <div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        ${avatarImg(r.from_user.avatar_url, r.from_user.username, "avatar").outerHTML}
        <div style="flex:1">
          <span style="font-weight:600">${esc(r.from_user.username)}</span>
          <span style="font-size:12px;color:var(--text-secondary);margin-left:8px">${timeAgo(r.created_at)}</span>
        </div>
        <button class="btn btn-primary btn-sm" data-accept="${r.id}">接受</button>
        <button class="btn btn-outline btn-sm" data-reject="${r.id}">拒绝</button>
      </div>`;
  },

  bindPendingButtons() {
    $$("[data-accept]").forEach(b => b.onclick = () => this.handleFriendRequest(b.dataset.accept, "accept"));
    $$("[data-reject]").forEach(b => b.onclick = () => this.handleFriendRequest(b.dataset.reject, "reject"));
  },

  async handleFriendRequest(id, action) {
    const res = await api.handleFriend(parseInt(id), action);
    if (res.code !== 0) {
      toast(res.msg, "error");
      return;
    }
    toast(action === "accept" ? "已添加为好友！" : "已拒绝");
    this.load("pending");
  }
};

// ==================== 个人资料模块 ====================
const ProfileModule = {
  async load() {
    const u = appState.user;
    if (!u) return;

    $("#profileContent").innerHTML = this.createProfileHTML(u);
    this.bindSaveButton();
  },

  createProfileHTML(u) {
    return `
      <div class="profile-header">
        ${avatarImg(u.avatar_url, u.username, "profile-avatar-large").outerHTML}
        <div class="profile-name">${esc(u.username)}</div>
        <div class="profile-email-display">${esc(u.email || "")}</div>
      </div>

      <div class="profile-details">
        <h3>编辑资料</h3>
        <div class="form-group">
          <label>用户名</label>
          <input class="input" id="editUsername" value="${esc(u.username)}">
        </div>
        <div class="form-group">
          <label>学校</label>
          <input class="input" id="editCampus" value="${esc(u.campus || "")}" placeholder="例如：北京大学">
        </div>
        <div class="form-group">
          <label>专业</label>
          <input class="input" id="editMajor" value="${esc(u.major || "")}" placeholder="例如：计算机科学">
        </div>
        <div class="form-group">
          <label>年级</label>
          <input class="input" id="editGrade" value="${esc(u.grade || "")}" placeholder="例如：大三">
        </div>
        <div class="form-group">
          <label>性别</label>
          <select class="input" id="editGender">
            <option value="0" ${u.gender === 0 ? "selected" : ""}>未设置</option>
            <option value="1" ${u.gender === 1 ? "selected" : ""}>男</option>
            <option value="2" ${u.gender === 2 ? "selected" : ""}>女</option>
          </select>
        </div>
        <div class="form-group">
          <label>生日</label>
          <input class="input" type="date" id="editBirthday" value="${u.birthday || ""}">
        </div>
        <div class="form-group">
          <label>个人简介</label>
          <textarea class="input textarea" id="editBio" placeholder="介绍一下自己...">${esc(u.bio || "")}</textarea>
        </div>
        <div class="form-group">
          <label>兴趣爱好（逗号分隔）</label>
          <input class="input" id="editInterests" value="${esc(u.interests || "")}" placeholder="篮球, 编程, 电影">
        </div>
        <button class="btn btn-primary" id="saveProfileBtn">保存修改</button>
      </div>`;
  },

  bindSaveButton() {
    $("#saveProfileBtn").onclick = async () => {
      const data = {
        username: $("#editUsername").value.trim(),
        campus: $("#editCampus").value.trim(),
        major: $("#editMajor").value.trim(),
        grade: $("#editGrade").value.trim(),
        gender: parseInt($("#editGender").value),
        birthday: $("#editBirthday").value || null,
        bio: $("#editBio").value.trim(),
        interests: $("#editInterests").value.trim(),
      };

      const res = await api.updateProfile(data);
      if (res.code !== 0) {
        toast(res.msg, "error");
        return;
      }

      appState.user = res.data;
      toast("资料更新成功！");
      this.load();
    };
  }
};

// ==================== 应用初始化模块 ====================
const AppModule = {
  async load() {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    api.setToken(token);

    const res = await api.getProfile();
    if (res.code !== 0) {
      localStorage.removeItem("token");
      return;
    }

    appState.user = res.data;
    appState.isLogin = true;

    $("#authOverlay").style.display = "none";
    $("#appLayout").style.display = "flex";

    NavigationModule.setup();
    NavigationModule.setupLogout();
    NavigationModule.navigateTo("feed");
  }
};

// ==================== 启动应用 ====================
AuthModule.init();
AppModule.load();
