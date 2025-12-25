# Sky Metropolis v2 - Production Roadmap: Quick Action Plan

**Date:** December 23, 2025  
**Goal:** Production-ready deployment in 3 weeks  
**Current Status:** 70% production ready

---

## 🚨 Critical Path (Week 1)

### Day 1-2: Security Hardening
**Owner:** Backend Engineer  
**Priority:** P0 (Blocker)

- [ ] Create backend API proxy for Gemini
  - Deploy serverless function (Vercel/Netlify)
  - Implement rate limiting (100 req/hour per user)
  - Add API key validation
  - Update frontend to call proxy
  - Test failover scenarios
- [ ] Add environment variable validation
  - Check for required vars on startup
  - Display friendly error if missing
  - Document all env vars in `.env.example`

**Success Criteria:**
- ✅ No API keys in frontend bundle
- ✅ Rate limiting works (test with load)
- ✅ Clear error messages for misconfiguration

---

### Day 3: Build Optimization
**Owner:** Frontend Engineer  
**Priority:** P0 (Blocker)

- [ ] Implement code splitting in `vite.config.ts`
  - Split vendor bundles (React, Three.js, AI)
  - Lazy load World systems
  - Configure compression (Brotli + Gzip)
- [ ] Fix Three.js deprecation warning
  - Replace `sRGBEncoding` with `SRGBColorSpace`
  - Test rendering consistency

**Success Criteria:**
- ✅ Initial bundle < 250 KB gzipped
- ✅ No build warnings
- ✅ Lighthouse score > 90

---

### Day 4-5: Observability
**Owner:** DevOps/Frontend  
**Priority:** P1 (High)

- [ ] Integrate Sentry error tracking
  - Set up project and DSN
  - Add to `main.tsx`
  - Configure source maps for production
  - Test error capture
- [ ] Add Google Analytics 4
  - Track key events (game start, building placed, goal completed)
  - Set up custom dashboards
  - Configure conversion tracking
- [ ] Create error boundary component
  - Graceful error recovery
  - User-friendly error screen
  - Auto-report to Sentry

**Success Criteria:**
- ✅ Errors appear in Sentry dashboard within 1 minute
- ✅ 95%+ events tracked in GA4
- ✅ Error boundary catches and displays all unhandled errors

---

## 🏗️ High Priority (Week 2)

### Day 6-7: Performance Optimization
**Owner:** Frontend Engineer  
**Priority:** P1

- [ ] Implement virtual rendering for grid
  - Calculate frustum bounds
  - Only render visible tiles
  - Measure FPS improvement
- [ ] Add XSS sanitization
  - Install DOMPurify
  - Sanitize all AI-generated text
  - Add tests for malicious input
- [ ] Self-host audio assets
  - Download from CDN
  - Optimize file sizes
  - Update paths in `useAudio.ts`

**Success Criteria:**
- ✅ 60 FPS on full city (48×48 with traffic)
- ✅ No XSS vulnerabilities in penetration test
- ✅ Audio loads < 2 seconds

---

### Day 8-9: Data Integrity
**Owner:** Frontend Engineer  
**Priority:** P1

- [ ] Add save data validation
  - Install Zod
  - Create schema for GameState
  - Validate on load, sanitize on error
  - Migration strategy for schema changes
- [ ] Implement save export/import
  - Add "Export Save" button
  - Add "Import Save" button with file picker
  - Base64 encoding for sharing
- [ ] Add Content Security Policy
  - Define CSP meta tag in `index.html`
  - Test with strict policy
  - Whitelist necessary domains

**Success Criteria:**
- ✅ Invalid saves gracefully handled (don't crash app)
- ✅ Users can export/import saves
- ✅ CSP headers prevent unauthorized resource loading

---

### Day 10: Testing & Documentation
**Owner:** Full Team  
**Priority:** P1

- [ ] Manual QA pass
  - Test all game modes (AI, sandbox)
  - Test on 3 browsers (Chrome, Firefox, Safari)
  - Test mobile responsive (if applicable)
  - Stress test (large city, long playtime)
- [ ] Update README
  - Add setup instructions
  - Document environment variables
  - Add deployment guide
  - Include troubleshooting section
- [ ] Create `.env.example`
  - List all required variables
  - Add comments explaining each

**Success Criteria:**
- ✅ No critical bugs found
- ✅ README is comprehensive and accurate
- ✅ New developers can set up project in < 10 minutes

---

## 🚀 Deployment (Week 3)

### Day 11-12: Deployment Pipeline
**Owner:** DevOps  
**Priority:** P0

- [ ] Set up CI/CD
  - GitHub Actions or similar
  - Run build on every commit
  - Deploy to staging on merge to main
  - Deploy to production on tag
- [ ] Configure hosting
  - Choose provider (Vercel, Netlify, Cloudflare Pages)
  - Configure custom domain
  - Set up SSL/TLS
  - Configure CDN for assets
- [ ] Set up staging environment
  - Separate from production
  - Different API keys/config
  - Test deployments here first

**Success Criteria:**
- ✅ Automated deployments working
- ✅ Staging environment accessible
- ✅ SSL certificate valid
- ✅ CDN serving assets correctly

---

### Day 13: Pre-Launch Checks
**Owner:** Full Team  
**Priority:** P0

- [ ] Security audit
  - Run OWASP ZAP or similar
  - Check for XSS, CSRF, injection vulnerabilities
  - Verify HTTPS enforcement
  - Check CSP headers
- [ ] Performance audit
  - Run Lighthouse on staging
  - Check Core Web Vitals
  - Test on slow 3G
  - Profile with Chrome DevTools
- [ ] Accessibility audit
  - Run axe DevTools
  - Test with screen reader
  - Check keyboard navigation
  - Verify ARIA labels

**Success Criteria:**
- ✅ No high-severity security issues
- ✅ Lighthouse score > 90 (all categories)
- ✅ No critical accessibility violations (WCAG AA)

---

### Day 14-15: Launch & Monitoring
**Owner:** Full Team  
**Priority:** P0

- [ ] Deploy to production
  - Tag release (v1.0.0)
  - Trigger production deployment
  - Verify deployment successful
  - Smoke test critical paths
- [ ] Set up monitoring dashboards
  - Sentry for errors
  - GA4 for analytics
  - Uptime monitoring (UptimeRobot, Pingdom)
  - Set up alerts (email, Slack)
- [ ] Post-launch monitoring (first 48 hours)
  - Watch error rates
  - Monitor performance metrics
  - Check user feedback
  - Be ready for hotfixes

**Success Criteria:**
- ✅ Production site is live and accessible
- ✅ No critical errors in first 2 hours
- ✅ Monitoring dashboards show green
- ✅ Team is available for support

---

## 📊 Success Metrics

### Technical Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Bundle Size (gzip) | 393 KB | <250 KB | 🔴 |
| Lighthouse Score | Unknown | >90 | ⚪ |
| FPS (full city) | 45 | 60 | 🟡 |
| Time to Interactive | ~3.5s | <3s | 🟡 |
| Error Rate | Unknown | <0.1% | ⚪ |

### Business Metrics (30 Days Post-Launch)
| Metric | Target | Tracking |
|--------|--------|----------|
| Daily Active Users | 500+ | GA4 |
| Avg Session Duration | 10+ min | GA4 |
| Return Rate (Day 7) | 30%+ | GA4 |
| Goal Completion Rate | 60%+ | Custom Event |
| Crash-Free Rate | 99.5%+ | Sentry |

---

## 🚧 Post-Launch (Week 4+)

### Week 4: User Feedback & Iteration
- Collect user feedback (surveys, reviews)
- Analyze analytics data
- Prioritize feature requests
- Fix critical bugs
- Plan next iteration

### Week 5-6: Tutorial & Onboarding
- Design interactive tutorial (3-5 steps)
- Implement tooltip system
- Add achievement system (10 achievements)
- Create statistics dashboard

### Week 7-8: Visual Polish
- Day/night cycle
- Weather effects (rain, snow)
- Particle systems (construction dust, smoke)
- Building construction animations

### Month 3+: Advanced Features
- Multiplayer collaboration
- Disaster events
- Zoning policies
- Tech tree/upgrades
- Monetization (premium content)

---

## 🎯 Risk Mitigation

### Risk: API Quota Exceeded
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Implement aggressive caching (5-10 min per goal)
- Add fallback rule-based goal generator
- Monitor quota usage daily
- Set up alerts at 80% usage

### Risk: Performance Issues on Low-End Devices
**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Implement quality settings (high/medium/low)
- Auto-detect device capabilities
- Reduce traffic/pedestrian count on mobile
- Add performance warning banner

### Risk: Launch Day Traffic Spike
**Probability:** Low  
**Impact:** High  
**Mitigation:**
- Load test before launch (100+ concurrent users)
- Use CDN for static assets
- Implement rate limiting
- Have scaling plan ready

---

## 📞 On-Call Rotation (Launch Week)

| Day | Primary | Secondary | Backup |
|-----|---------|-----------|--------|
| Mon | Alice | Bob | Charlie |
| Tue | Bob | Charlie | Alice |
| Wed | Charlie | Alice | Bob |
| Thu | Alice | Bob | Charlie |
| Fri | Bob | Charlie | Alice |
| Sat | Charlie | Alice | Bob |
| Sun | Alice | Bob | Charlie |

**Contact Info:**
- Slack: #skymetropolis-oncall
- Email: oncall@skymetropolis.dev
- Phone: [Emergency Only]

---

## 📝 Pre-Launch Checklist

### Code
- [ ] All critical bugs fixed
- [ ] No console.log statements in production
- [ ] No commented-out code
- [ ] All TypeScript errors resolved
- [ ] Bundle optimized (<250KB gzipped)

### Security
- [ ] API keys moved to backend
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] XSS sanitization implemented
- [ ] Security audit passed

### Performance
- [ ] Lighthouse score >90
- [ ] 60 FPS on target devices
- [ ] Core Web Vitals passing
- [ ] Virtual rendering implemented
- [ ] Assets optimized (images, audio)

### Monitoring
- [ ] Sentry configured and tested
- [ ] Analytics tracking implemented
- [ ] Uptime monitoring set up
- [ ] Alert thresholds configured
- [ ] On-call rotation scheduled

### Documentation
- [ ] README complete
- [ ] .env.example created
- [ ] Deployment guide written
- [ ] API documentation (if applicable)
- [ ] Troubleshooting guide

### Legal
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent (if in EU)
- [ ] GDPR compliance (if in EU)
- [ ] License file present

### Marketing (Optional)
- [ ] Landing page ready
- [ ] Social media accounts created
- [ ] Press kit prepared
- [ ] Launch announcement drafted
- [ ] Community channels set up

---

## 🆘 Emergency Contacts

**Production Issues:**
- Hosting: [Provider Support]
- API: Google Gemini Support
- DNS: [DNS Provider]
- CDN: [CDN Provider]

**Team:**
- Tech Lead: [Name/Contact]
- Product Manager: [Name/Contact]
- DevOps: [Name/Contact]

---

## 📈 Post-Launch Review (Day 7)

### Review Agenda
1. Metrics review (vs targets)
2. User feedback summary
3. Bug/issue retrospective
4. Performance analysis
5. Next iteration planning

### Questions to Answer
- What went well?
- What didn't go well?
- What surprised us?
- What should we do differently next time?
- What are the top 3 priorities for next sprint?

---

**Document Owner:** Product Team  
**Last Updated:** December 23, 2025  
**Next Review:** Weekly during production push
