const API_BASE = "http://127.0.0.1:8000";

const api = {
  token: null,

  setToken(t) { this.token = t; },

  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    return res.json();
  },

  get(path)      { return this.request("GET", path); },
  post(path, b)  { return this.request("POST", path, b); },
  put(path, b)   { return this.request("PUT", path, b); },
  del(path)      { return this.request("DELETE", path); },

  register(data)    { return this.post("/api/auth/register", data); },
  login(data)       { return this.post("/api/auth/login", data); },
  getProfile()      { return this.get("/api/users/me"); },
  updateProfile(d)  { return this.put("/api/users/me", d); },
  getUser(id)       { return this.get(`/api/users/${id}`); },
  getPosts(sort, p) { return this.get(`/api/posts?sort=${sort}&page=${p}&page_size=20`); },
  createPost(d)     { return this.post("/api/posts", d); },
  getPost(id)       { return this.get(`/api/posts/${id}`); },
  deletePost(id)    { return this.del(`/api/posts/${id}`); },
  getComments(pid)  { return this.get(`/api/comments/posts/${pid}`); },
  addComment(pid,d) { return this.post(`/api/comments/posts/${pid}`, d); },
  delComment(id)    { return this.del(`/api/comments/${id}`); },
  likePost(id)      { return this.post(`/api/social/likes/${id}`); },
  getRecommend()    { return this.get("/api/social/recommendations"); },
  requestFriend(id) { return this.post(`/api/social/friendships/request/${id}`); },
  handleFriend(id,action) { return this.put(`/api/social/friendships/${id}?action=${action}`); },
  getPending()      { return this.get("/api/social/friendships"); },
  getFriends()      { return this.get("/api/social/friends"); },

  favoritePost(id)   { return this.post(`/api/posts/${id}/favorite`); },
  unfavoritePost(id) { return this.del(`/api/posts/${id}/favorite`); },
  getFavorites()     { return this.get("/api/posts/favorites/me"); },
};
