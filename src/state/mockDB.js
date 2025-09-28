let _id = 1;
const uid = () => String(_id++);

export const db = {
  users: [{ id: 'u1', name: 'IITB Student', impact: 0, badges: [] }],
  communities: [
    { id: 'c1', name: 'IITB General', parentId: null, members: ['u1'], posts: [] },
    { id: 'c2', name: 'Hostel 8', parentId: 'c1', members: ['u1'], posts: [] },
  ],
  notifications: [],
};

export const api = {
  listCommunities(){ return new Promise(res => setTimeout(() => res(db.communities), 200)); },
  createCommunity({ name, parentId = null }){
    return new Promise(res => setTimeout(()=>{
      const c = { id: uid(), name, parentId, members: [], posts: [] };
      db.communities.push(c);
      db.notifications.unshift({ id: uid(), text: `New community created: ${name}`, ts: Date.now() });
      res(c);
    },200));
  },
  joinCommunity({ userId, communityId }){
    return new Promise(res => setTimeout(()=>{
      const c = db.communities.find(x=>x.id===communityId);
      if (!c.members.includes(userId)) c.members.push(userId);
      db.notifications.unshift({ id: uid(), text: `Joined ${c.name}`, ts: Date.now() });
      res(c);
    },200));
  },
  autoJoinChild({ userId, parentId }){
    return new Promise(res => setTimeout(()=>{
      const child = db.communities.find(x=>x.parentId===parentId);
      if (child && !child.members.includes(userId)) {
        child.members.push(userId);
        db.notifications.unshift({ id: uid(), text: `Auto-joined ${child.name}`, ts: Date.now() });
      }
      res(child||null);
    },200));
  },
  createPost({ communityId, userId, text }){
    return new Promise(res => setTimeout(()=>{
      const c = db.communities.find(x=>x.id===communityId);
      const p = { id: uid(), text, userId, ts: Date.now(), up:0, down:0 };
      c.posts.unshift(p);
      db.notifications.unshift({ id: uid(), text: `New post in ${c.name}`, ts: Date.now() });
      res(p);
    },200));
  },
  votePost({ communityId, postId, delta }){
    return new Promise(res => setTimeout(()=>{
      const c = db.communities.find(x=>x.id===communityId);
      const p = c.posts.find(x=>x.id===postId);
      if (delta>0) p.up+=1; else p.down+=1;
      const u = db.users.find(x=>x.id===p.userId);
      u.impact = Math.max(0, (u.impact||0) + delta);
      res(p);
    },120));
  },
  listNotifications(){ return new Promise(res => setTimeout(()=>res(db.notifications),150)); },
  currentUser(){ return db.users[0]; }
};
