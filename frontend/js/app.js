const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let appState = { user: null, isLogin: false, currentPage: "feed" };

function toast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function timeAgo(dt) {
  const now = Date.now(), diff = now - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  return `${Math.floor(hrs / 24)}天前`;
}

function avatarFallback(name, cls = "avatar") {
  const el = document.createElement("div");
  el.className = cls;
  if (name) el.textContent = name.charAt(0).toUpperCase();
  else el.textContent = "?";
  return el;
}

function avatarImg(url, name, cls = "avatar") {
  if (url) {
    const img = document.createElement("img");
    img.className = cls;
    img.src = url;
    img.onerror = function () { this.replaceWith(avatarFallback(name, cls)); };
    return img;
  }
  return avatarFallback(name, cls);
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

// ==================== Auth ====================
let isRegisterMode = false;

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  $("#authTitle").textContent = isRegisterMode ? "注册" : "登录";
  $("#authSubtitle").textContent = isRegisterMode ? "加入校园交友平台" : "欢迎回到校园交友平台";
  $("#authSubmitBtn").textContent = isRegisterMode ? "注册" : "登录";
  $("#usernameGroup").style.display = isRegisterMode ? "block" : "none";
  $("#confirmGroup").style.display = isRegisterMode ? "block" : "none";
  $("#authToggle").innerHTML = isRegisterMode
    ? '已有账号？<a id="toggleAuthMode">立即登录</a>'
    : '还没有账号？<a id="toggleAuthMode">立即注册</a>';
  $("#authError").textContent = "";
  document.getElementById("toggleAuthMode").addEventListener("click", toggleAuthMode);
}

document.getElementById("toggleAuthMode").addEventListener("click", toggleAuthMode);

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value.trim();

  if (!email || !password) {
    $("#authError").textContent = "请填写完整信息";
    return;
  }

  if (isRegisterMode) {
    const username = $("#authUsername").value.trim();
    const confirm = $("#authConfirmPassword").value.trim();
    if (!username) {
      $("#authError").textContent = "请输入用户名";
      return;
    }
    if (password !== confirm) {
      $("#authError").textContent = "两次密码不一致";
      return;
    }
    if (password.length < 6) {
      $("#authError").textContent = "密码至少6位";
      return;
    }

    const res = await api.register({ username, email, password });
    if (res.code !== 0) {
      $("#authError").textContent = res.msg;
      return;
    }
    toast("注册成功，请登录");
    toggleAuthMode();
  } else {
    const res = await api.login({ email, password });
    if (res.code !== 0) {
      $("#authError").textContent = res.msg;
      return;
    }
    api.setToken(res.data.access_token);
    localStorage.setItem("token", res.data.access_token);
    await loadApp();
  }
});

// ==================== App Init ====================
async function loadApp() {
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

  navigateTo("feed");
  setupNav();
  setupLogout();
}

function setupNav() {
  $$(".sidebar-nav a[data-page]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });
}

function setupLogout() {
  $("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    api.setToken(null);
    appState.isLogin = false;
    appState.user = null;

    $("#appLayout").style.display = "none";
    $("#authOverlay").style.display = "flex";
    if (isRegisterMode) toggleAuthMode();
    $("#authError").textContent = "";
  });
}

function navigateTo(page) {
  appState.currentPage = page;
  $$(".sidebar-nav a").forEach(a => a.classList.remove("active"));
  $(`.sidebar-nav a[data-page="${page}"]`)?.classList.add("active");
  $$(".page").forEach(p => p.classList.remove("active"));
  $(`#page-${page}`)?.classList.add("active");

  switch (page) {
    case "feed":
      loadFeed();
      break;
    case "recommend":
      loadRecommend();
      break;
    case "friends":
      loadFriends();
      break;
    case "favorites":
      loadFavorites();
      break;
    case "profile":
      loadProfile();
      break;
  }
}

// ==================== Feed ====================
let feedSort = "latest", feedPage = 1;

async function loadFeed() {
  $("#feedList").innerHTML = '<div class="loading">加载中...</div>';
  feedPage = 1;

  const res = await api.getPosts(feedSort, feedPage);
  if (res.code !== 0) {
    $("#feedList").innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    return;
  }

  renderPosts(res.data);
  setupComposer();
  initPostEvents();
}

function renderPosts(posts) {
  if (!posts.length) {
    $("#feedList").innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>暂无动态，快来发布第一条吧！</p></div>';
    return;
  }

  $("#feedList").innerHTML = posts.map(p => `
    <div class="card post-card" data-post-id="${p.id}">
      ${avatarImg(p.avatar_url, p.username).outerHTML.replace('<div', '<div style="cursor:pointer"')}
      <div class="post-body">
        <div class="post-header">
          <span class="name">${esc(p.username)}</span>
          <span class="time">${timeAgo(p.created_at)}</span>
        </div>
        <div class="post-content">${esc(p.content)}</div>
        ${p.images && p.images.length ? `
        <div class="post-images">
          ${p.images.map(img => `<img src="${img}" alt="">`).join("")}
        </div>` : ""}
        <div class="post-footer">
          <button class="${p.is_liked ? "liked" : ""}" data-action="like" data-post-id="${p.id}">
            ${p.is_liked ? "❤️" : "🤍"} <span class="count">${p.like_count || 0}</span>
          </button>
          <button class="${p.is_favorited ? "favorited" : ""}" data-action="favorite" data-post-id="${p.id}">
            ${p.is_favorited ? "⭐ 已收藏" : "☆ 收藏"}
          </button>
          <button data-action="comment" data-post-id="${p.id}">
            💬 <span class="count">${p.comment_count || 0}</span>
          </button>
          <button data-action="detail" data-post-id="${p.id}">📋 详情</button>
        </div>
        <div class="comment-section" id="comments-${p.id}" style="display:none"></div>
      </div>
    </div>
  `).join("");
}

function setupComposer() {
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
    loadFeed();
  };
}

// ==================== Favorites ====================
async function loadFavorites() {
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
    container.innerHTML = '<div class="empty-state favorites-empty"><div class="icon">⭐</div><p>你还没有收藏任何帖子</p></div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="card post-card" data-post-id="${item.post_id}">
      ${avatarImg(item.avatar_url, item.username).outerHTML}
      <div class="post-body">
        <div class="post-header">
          <span class="name">${esc(item.username)}</span>
          <span class="time">收藏于 ${timeAgo(item.created_at)}</span>
        </div>
        <div class="post-content">${esc(item.content)}</div>
        ${item.images && item.images.length ? `
        <div class="post-images">
          ${item.images.map(img => `<img src="${img}" alt="">`).join("")}
        </div>` : ""}
        <div class="post-footer">
          <button class="favorited" data-action="favorite" data-post-id="${item.post_id}">
            ⭐ 已收藏
          </button>
          <button data-action="detail" data-post-id="${item.post_id}">📋 详情</button>
          <button disabled>
            ❤️ <span class="count">${item.like_count || 0}</span>
          </button>
          <button disabled>
            💬 <span class="count">${item.comment_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  `).join("");

  initPostEvents();
}

// ==================== Post Events ====================
function initPostEvents() {
  $$("[data-action='like']").forEach(btn => {
    btn.onclick = async () => {
      const pid = btn.dataset.postId;
      const res = await api.likePost(pid);
      if (res.code !== 0) {
        toast(res.msg, "error");
        return;
      }
      btn.classList.toggle("liked", res.data.liked);
      btn.innerHTML = `${res.data.liked ? "❤️" : "🤍"} <span class="count">${res.data.like_count}</span>`;
    };
  });

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
        loadFavorites();
        return;
      }

      btn.classList.toggle("favorited", !isFavorited);
      btn.innerHTML = !isFavorited ? "⭐ 已收藏" : "☆ 收藏";
      toast(!isFavorited ? "收藏成功" : "已取消收藏");
    };
  });

  $$("[data-action='comment']").forEach(btn => {
    btn.onclick = async () => {
      const pid = btn.dataset.postId;
      const section = $(`#comments-${pid}`);
      if (section.style.display === "block") {
        section.style.display = "none";
        return;
      }
      await loadComments(pid);
      section.style.display = "block";
    };
  });

  $$("[data-action='detail']").forEach(btn => {
    btn.onclick = () => {
      showPostDetail(parseInt(btn.dataset.postId));
    };
  });
}

async function loadComments(postId) {
  const section = $(`#comments-${postId}`);
  const res = await api.getComments(postId);
  if (res.code !== 0) return;

  section.innerHTML = renderCommentTree(res.data, postId) + `
    <div class="comment-reply-box">
      <input class="input" id="commentInput-${postId}" placeholder="写评论...">
      <button class="btn btn-primary btn-sm" data-submit-comment="${postId}">发送</button>
    </div>`;

  section.querySelector(`[data-submit-comment="${postId}"]`).onclick = () => submitComment(postId, null);
}

function renderCommentTree(comments, postId, depth = 0) {
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
      ${c.replies ? renderCommentTree(c.replies, postId, depth + 1) : ""}
    </div>`;
  }).join("") + initReplyButtons();
}

function initReplyButtons() {
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
        submitComment(postId, parentId);
      };
    });
  }, 0);
  return "";
}

async function submitComment(postId, parentId) {
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
  await loadComments(postId);
  loadFeed();
}

// ==================== Post Detail ====================
async function showPostDetail(postId) {
  const res = await api.getPost(postId);
  if (res.code !== 0) {
    toast(res.msg, "error");
    return;
  }
  const p = res.data;

  $("#feedList").innerHTML = `
    <button class="btn btn-outline btn-sm back-btn" id="backToFeed">← 返回动态列表</button>
    <div class="card post-card">
      ${avatarImg(p.avatar_url, p.username).outerHTML}
      <div class="post-body">
        <div class="post-header">
          <span class="name">${esc(p.username)}</span>
          <span class="time">${timeAgo(p.created_at)}</span>
        </div>
        <div class="post-content">${esc(p.content)}</div>
        ${p.images && p.images.length ? `
        <div class="post-images">
          ${p.images.map(img => `<img src="${img}" alt="">`).join("")}
        </div>` : ""}
        <div class="post-footer">
          <button class="${p.is_liked ? "liked" : ""}" data-action="like" data-post-id="${p.id}">
            ${p.is_liked ? "❤️" : "🤍"} <span class="count">${p.like_count || 0}</span>
          </button>
          <button class="${p.is_favorited ? "favorited" : ""}" data-action="favorite" data-post-id="${p.id}">
            ${p.is_favorited ? "⭐ 已收藏" : "☆ 收藏"}
          </button>
          <span style="font-size:13px;color:var(--text-secondary)">👁 ${p.view_count} 浏览</span>
        </div>
        <div class="comment-section" id="comments-${p.id}" style="display:block"></div>
      </div>
    </div>`;

  document.getElementById("backToFeed").onclick = loadFeed;
  initPostEvents();
  await loadComments(postId);
}

// ==================== Recommend ====================
async function loadRecommend() {
  $("#recommendList").innerHTML = '<div class="loading">正在为你匹配...</div>';

  const res = await api.getRecommend();
  if (res.code !== 0) {
    $("#recommendList").innerHTML = '<div class="empty-state"><p>暂无推荐</p></div>';
    return;
  }

  const list = res.data;
  if (!list.length) {
    $("#recommendList").innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>暂时没有更多推荐，完善个人信息可获得更精准推荐哦</p></div>';
    return;
  }

  $("#recommendList").innerHTML = list.map(u => `
    <div class="card recommend-card">
      ${avatarImg(u.avatar_url, u.username, "avatar avatar-lg").outerHTML}
      <div class="name">${esc(u.username)}</div>
      <div class="campus">${esc(u.campus || "未知校园")} · ${esc(u.major || "未知专业")}</div>
      ${u.bio ? `<p style="font-size:13px;color:var(--text-secondary);margin:4px 0">${esc(u.bio)}</p>` : ""}
      <div class="tags">
        ${(u.interests || "").split(",").filter(Boolean).map(t => `<span class="badge badge-primary">${esc(t.trim())}</span>`).join("")}
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">匹配度: ${Math.round(u.score * 100 / 7)}%</div>
      <button class="btn btn-primary btn-sm" data-add-friend="${u.id}">加好友</button>
    </div>
  `).join("");

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

// ==================== Friends ====================
async function loadFriends(tab = "list") {
  if (tab === "list") {
    const res = await api.getFriends();
    if (res.code !== 0) return;
    const friends = res.data;
    if (!friends.length) {
      $("#friendListContent").innerHTML = '<div class="empty-state"><div class="icon">👋</div><p>还没有好友，去交友推荐看看吧！</p></div>';
    } else {
      $("#friendListContent").innerHTML = '<div class="friend-list">' + friends.map(f => `
        <div class="card friend-item">
          ${avatarImg(f.avatar_url, f.username, "avatar").outerHTML}
          <div class="info">
            <div class="name">${esc(f.username)}</div>
            <div class="campus">${esc(f.campus || "")} ${esc(f.major || "")}</div>
          </div>
        </div>
      `).join("") + "</div>";
    }
  } else {
    const res = await api.getPending();
    if (res.code !== 0) return;
    const pending = res.data;
    if (!pending.length) {
      $("#friendListContent").innerHTML = '<div class="empty-state"><div class="icon">📨</div><p>暂无待处理的好友申请</p></div>';
    } else {
      $("#friendListContent").innerHTML = pending.map(r => `
        <div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          ${avatarImg(r.from_user.avatar_url, r.from_user.username, "avatar").outerHTML}
          <div style="flex:1">
            <span style="font-weight:600">${esc(r.from_user.username)}</span>
            <span style="font-size:12px;color:var(--text-secondary);margin-left:8px">${timeAgo(r.created_at)}</span>
          </div>
          <button class="btn btn-primary btn-sm" data-accept="${r.id}">接受</button>
          <button class="btn btn-outline btn-sm" data-reject="${r.id}">拒绝</button>
        </div>
      `).join("");

      $$("[data-accept]").forEach(b => b.onclick = () => handleFriendReq(b.dataset.accept, "accept"));
      $$("[data-reject]").forEach(b => b.onclick = () => handleFriendReq(b.dataset.reject, "reject"));
    }
  }

  $$("[data-friend-tab]").forEach(t => {
    t.classList.toggle("active", t.dataset.friendTab === tab);
    t.onclick = () => loadFriends(t.dataset.friendTab);
  });
}

async function handleFriendReq(id, action) {
  const res = await api.handleFriend(parseInt(id), action);
  if (res.code !== 0) {
    toast(res.msg, "error");
    return;
  }
  toast(action === "accept" ? "已添加为好友！" : "已拒绝");
  loadFriends("pending");
}

// ==================== Profile ====================
async function loadProfile() {
  const u = appState.user;
  if (!u) return;

  $("#profileContent").innerHTML = `
    <div class="profile-header">
      ${avatarImg(u.avatar_url, u.username, "avatar avatar-lg").outerHTML}
      <div class="profile-info">
        <h2>${esc(u.username)}</h2>
        <div class="meta">${esc(u.campus || "未设置学校")} · ${esc(u.major || "未设置专业")} · ${esc(u.grade || "")}</div>
        <div class="bio">${esc(u.bio || "这个人很懒，什么都没写...")}</div>
        <div class="tags" style="margin-top:8px">
          ${(u.interests || "").split(",").filter(Boolean).map(t => `<span class="badge badge-primary">${esc(t.trim())}</span>`).join("")}
        </div>
        <div class="profile-stats">
          <div><div class="num">${u.gender === 1 ? "♂" : u.gender === 2 ? "♀" : "—"}</div><div class="label">性别</div></div>
          <div><div class="num">${u.birthday || "—"}</div><div class="label">生日</div></div>
        </div>
      </div>
    </div>
    <div style="margin-top:16px">
      <h3 style="margin-bottom:12px">编辑资料</h3>
      <div class="edit-form">
        <div class="form-row">
          <div class="form-group">
            <label>用户名</label>
            <input class="input" id="editUsername" value="${esc(u.username)}">
          </div>
          <div class="form-group">
            <label>学校</label>
            <input class="input" id="editCampus" value="${esc(u.campus || "")}" placeholder="例如：北京大学">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>专业</label>
            <input class="input" id="editMajor" value="${esc(u.major || "")}" placeholder="例如：计算机科学">
          </div>
          <div class="form-group">
            <label>年级</label>
            <input class="input" id="editGrade" value="${esc(u.grade || "")}" placeholder="例如：大三">
          </div>
        </div>
        <div class="form-row">
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
      </div>
    </div>
  `;

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
    loadProfile();
  };
}

// ==================== Init ====================
loadApp();
