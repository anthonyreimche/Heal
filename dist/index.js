//#region src/rt.ts
var e, t;
function n(n) {
	t = n, e = n.react;
}
//#endregion
//#region src/transform.ts
function r(e, t) {
	let n = Array(9);
	for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) n[r * 3 + i] = e[r * 3 + 0] * t[0 + i] + e[r * 3 + 1] * t[3 + i] + e[r * 3 + 2] * t[6 + i];
	return n;
}
function i(e, t, n) {
	let r = e[0] * t + e[1] * n + e[2], i = e[3] * t + e[4] * n + e[5], a = e[6] * t + e[7] * n + e[8], o = a === 0 ? 1e-6 : a;
	return {
		x: r / o,
		y: i / o
	};
}
function a(e) {
	let t = Math.cos(e), n = Math.sin(e);
	return [
		t,
		-n,
		0,
		n,
		t,
		0,
		0,
		0,
		1
	];
}
function o(e, t) {
	return [
		e,
		0,
		0,
		0,
		t,
		0,
		0,
		0,
		1
	];
}
function s(e, t) {
	return [
		1,
		0,
		e,
		0,
		1,
		t,
		0,
		0,
		1
	];
}
function c(e) {
	return [[
		e,
		0,
		-.5 * e,
		0,
		1,
		-.5,
		0,
		0,
		1
	], [
		1 / e,
		0,
		.5,
		0,
		1,
		.5,
		0,
		0,
		1
	]];
}
function l(e, t, n) {
	return {
		theta: e * Math.PI / 180,
		gh: t.perspectiveH / 100 * .6,
		gv: t.perspectiveV / 100 * .6,
		as: 1.5 ** (t.aspect / 100),
		s: 2 ** ((t.scale - 100) / 200),
		tx: t.offsetX / 100 * .5 * n,
		ty: t.offsetY / 100 * .5,
		fh: t.flipH ? -1 : 1,
		fv: t.flipV ? -1 : 1
	};
}
function u(e, t, n) {
	let { theta: i, gh: u, gv: d, as: f, s: p, tx: m, ty: h, fh: g, fv: _ } = l(e, t, n), [v, y] = c(n), b = o(g, _), x = [
		1,
		0,
		0,
		0,
		1,
		0,
		-u,
		-d,
		1
	], S = o(1 / f, f), C = o(1 / p, 1 / p), w = s(-m, -h), T = r(a(i), b);
	return T = r(T, x), T = r(T, S), T = r(T, C), T = r(T, w), r(y, r(T, v));
}
function d(e, t, n) {
	let { theta: i, gh: u, gv: d, as: f, s: p, tx: m, ty: h, fh: g, fv: _ } = l(e, t, n), [v, y] = c(n), b = [
		1,
		0,
		0,
		0,
		1,
		0,
		u,
		d,
		1
	], x = o(g, _), S = r(s(m, h), o(p, p));
	return S = r(S, o(f, 1 / f)), S = r(S, b), S = r(S, x), S = r(S, a(-i)), r(y, r(S, v));
}
//#endregion
//#region src/heal-pyramid.ts
var f = class {
	widths = [];
	heights = [];
	levels = [];
	constructor(e, t, n) {
		for (this.levels.push({
			w: t,
			h: n,
			data: e,
			stride: 4
		}), this.widths.push(t), this.heights.push(n);;) {
			let e = Math.floor(this.widths[this.widths.length - 1] / 2), t = Math.floor(this.heights[this.heights.length - 1] / 2);
			if (Math.min(e, t) < 1 || Math.max(e, t) < 32) break;
			this.widths.push(e), this.heights.push(t);
		}
	}
	get count() {
		return this.heights.length;
	}
	pixels(e) {
		for (; this.levels.length <= e;) {
			let e = this.levels[this.levels.length - 1], t = this.widths[this.levels.length], n = this.heights[this.levels.length], r = new Float32Array(t * n * 3), i = e.stride;
			for (let a = 0; a < n; a++) for (let n = 0; n < t; n++) {
				let o = (2 * a * e.w + 2 * n) * i, s = o + e.w * i, c = (a * t + n) * 3;
				for (let t = 0; t < 3; t++) r[c + t] = (e.data[o + t] + e.data[o + i + t] + e.data[s + t] + e.data[s + i + t]) / 4;
			}
			this.levels.push({
				w: t,
				h: n,
				data: r,
				stride: 3
			});
		}
		return this.levels[e];
	}
};
function p(e, t, n, r, i) {
	let a = Math.max(0, Math.floor(t)), o = Math.max(0, Math.floor(n)), s = Math.min(e.w - 1, Math.ceil(r)) - a + 1, c = Math.min(e.h - 1, Math.ceil(i)) - o + 1, l = Math.max(0, a - 2), u = Math.max(0, o - 2), d = Math.min(e.w - 1, a + s + 1) - l + 1, f = Math.min(e.h - 1, o + c + 1) - u + 1, p = new Float32Array(d * f);
	for (let t = 0; t < f; t++) for (let n = 0; n < d; n++) {
		let r = ((u + t) * e.w + l + n) * e.stride;
		p[t * d + n] = (e.data[r] + e.data[r + 1] + e.data[r + 2]) / 3;
	}
	let m = new Float32Array(d * f);
	for (let e = 0; e < f; e++) {
		let t = e * d;
		for (let e = 0; e < d; e++) m[t + e] = (p[t + Math.max(0, e - 1)] + 2 * p[t + e] + p[t + Math.min(d - 1, e + 1)]) / 4;
	}
	let h = new Float32Array(d * f);
	for (let e = 0; e < f; e++) {
		let t = Math.max(0, e - 1) * d, n = e * d, r = Math.min(f - 1, e + 1) * d;
		for (let e = 0; e < d; e++) h[n + e] = (m[t + e] + 2 * m[n + e] + m[r + e]) / 4;
	}
	let g = new Float32Array(s * c), _ = new Float32Array(s * c), v = new Float32Array(s * c), y = new Float32Array(s * c), b = new Float32Array(s * c);
	for (let t = 0; t < c; t++) {
		let n = o + t - u;
		for (let r = 0; r < s; r++) {
			let i = a + r - l, c = t * s + r, u = ((o + t) * e.w + a + r) * e.stride, p = e.data[u], m = e.data[u + 1], x = e.data[u + 2];
			g[c] = (p + m + x) / 3, _[c] = p - x, v[c] = (p + x) / 2 - m, y[c] = (h[n * d + Math.min(d - 1, i + 1)] - h[n * d + Math.max(0, i - 1)]) / 2, b[c] = (h[Math.min(f - 1, n + 1) * d + i] - h[Math.max(0, n - 1) * d + i]) / 2;
		}
	}
	return {
		x0: a,
		y0: o,
		w: s,
		h: c,
		L: g,
		A: _,
		B: v,
		gx: y,
		gy: b
	};
}
function m(e, t, n) {
	let r = e + n;
	return r <= 1e-9 ? {
		theta: 0,
		coherence: 0
	} : {
		theta: .5 * Math.atan2(2 * t, e - n),
		coherence: Math.sqrt((e - n) * (e - n) + 4 * t * t) / r
	};
}
//#endregion
//#region src/heal-region.ts
var h = .5, g = 3, _ = 256, v = 128, y = 12, b = 96, x = 8, S = 0, C = 1, w = 2;
function T(e) {
	return e.shape === "brush" && e.dabs && e.dabs.length > 0 ? {
		kind: "brush",
		dabs: e.dabs
	} : {
		kind: "circle",
		x: e.dstX,
		y: e.dstY,
		radius: e.radius,
		feather: e.feather / 100
	};
}
var E = (e) => e.filter((e) => !e.erase);
function D(e) {
	if (e.kind === "circle") return {
		x: e.x,
		y: e.y
	};
	let t = E(e.dabs), n = t.length > 0 ? t : e.dabs, r = 0, i = 0;
	for (let e of n) r += e.x, i += e.y;
	return {
		x: r / n.length,
		y: i / n.length
	};
}
function O(e) {
	if (e.kind === "circle") return e.radius;
	let t = 0;
	for (let n of E(e.dabs)) t = Math.max(t, n.radius);
	return t;
}
function k(e, t) {
	if (e.kind === "circle") return 2 * e.radius * (1 + e.feather);
	let n = E(e.dabs);
	if (n.length === 0) return 0;
	let r = Infinity;
	for (let e = 0; e < x; e++) {
		let i = e * Math.PI / x, a = Math.cos(i), o = Math.sin(i), s = Infinity, c = -Infinity;
		for (let e of n) {
			let n = e.x * t * a + e.y * o;
			s = Math.min(s, n - e.radius), c = Math.max(c, n + e.radius);
		}
		r = Math.min(r, c - s);
	}
	return r;
}
function A(e, t, n) {
	for (let r = 0; r < n.length; r++) if (e * n[r] <= y && t * n[r] <= b) return r;
	return n.length - 1;
}
function j(e, t, n, r, i, a, o) {
	let s = Math.max(0, Math.floor(e - i)), c = Math.max(0, Math.floor(t - i)), l = Math.min(a - 1, Math.ceil(n + i)), u = Math.min(o - 1, Math.ceil(r + i));
	if (l < s || u < c) return null;
	let d = l - s + 1, f = u - c + 1;
	return {
		x0: s,
		y0: c,
		w: d,
		h: f,
		margin: i,
		cls: new Uint8Array(d * f)
	};
}
function M(e, t, n) {
	let r = t - e.x0, i = n - e.y0;
	r >= 0 && i >= 0 && r < e.w && i < e.h && (e.cls[i * e.w + r] = w);
}
function N(e, t, n, r) {
	let i = e.x * t - .5, a = e.y * n - .5, o = e.radius * n, s = o * (1 + e.feather), c = j(i - s, a - s, i + s, a + s, r + 2, t, n);
	if (!c) return null;
	let l = !1;
	for (let e = 0; e < c.h; e++) for (let t = 0; t < c.w; t++) {
		let n = Math.hypot(c.x0 + t - i, c.y0 + e - a), r = n < o ? w : n < s ? C : S;
		c.cls[e * c.w + t] = r, r === w && (l = !0);
	}
	return l || M(c, Math.round(i), Math.round(a)), c;
}
function P(e, t, n, r) {
	let i = Infinity, a = Infinity, o = -Infinity, s = -Infinity, c = 0;
	for (let r of E(e)) {
		let e = r.x * t - .5, l = r.y * n - .5, u = r.radius * n;
		i = Math.min(i, e - u), a = Math.min(a, l - u), o = Math.max(o, e + u), s = Math.max(s, l + u), c = Math.max(c, u);
	}
	if (o < i) return null;
	let l = j(i, a, o, s, c + r + 2, t, n);
	if (!l) return null;
	let u = new Float32Array(l.w * l.h);
	for (let r of e) {
		let e = r.x * t - .5, i = r.y * n - .5, a = r.radius * n;
		if (a <= 0) continue;
		let o = a * (1 - Math.max(0, Math.min(1, r.feather))), s = Math.max(0, Math.floor(e - a) - l.x0), c = Math.min(l.w - 1, Math.ceil(e + a) - l.x0), d = Math.max(0, Math.floor(i - a) - l.y0), f = Math.min(l.h - 1, Math.ceil(i + a) - l.y0);
		for (let t = d; t <= f; t++) for (let n = s; n <= c; n++) {
			let s = Math.hypot(l.x0 + n - e, l.y0 + t - i), c = s <= o ? 1 : s < a ? (a - s) / (a - o) : 0;
			if (c <= 0) continue;
			let d = t * l.w + n;
			u[d] = r.erase ? u[d] * (1 - c) : Math.max(u[d], c);
		}
	}
	let d = -1, f = 0;
	for (let e = 0; e < u.length; e++) {
		let t = u[e];
		l.cls[e] = t >= h ? w : t > 0 ? C : S, t > f && (f = t, d = e);
	}
	return f <= 0 ? null : (f < h && (l.cls[d] = w), l);
}
var F = 0x56bc75e2d63100000;
function I(e) {
	let { w: t, h: n, cls: r } = e, i = new Float64Array(t * n);
	for (let e = 0; e < i.length; e++) i[e] = r[e] === w ? 0 : F;
	let a = Math.max(t, n), o = new Float64Array(a), s = new Float64Array(a), c = new Float64Array(a + 1), l = new Int32Array(a);
	for (let e = 0; e < t; e++) {
		for (let r = 0; r < n; r++) o[r] = i[r * t + e];
		L(o, n, s, l, c);
		for (let r = 0; r < n; r++) i[r * t + e] = s[r];
	}
	for (let e = 0; e < n; e++) {
		for (let n = 0; n < t; n++) o[n] = i[e * t + n];
		L(o, t, s, l, c);
		for (let n = 0; n < t; n++) i[e * t + n] = s[n];
	}
	let u = new Float32Array(t * n);
	for (let e = 0; e < u.length; e++) u[e] = Math.sqrt(i[e]);
	return u;
}
function L(e, t, n, r, i) {
	let a = 0;
	r[0] = 0, i[0] = -Infinity, i[1] = Infinity;
	for (let n = 1; n < t; n++) {
		let t = (e[n] + n * n - (e[r[a]] + r[a] * r[a])) / (2 * (n - r[a]));
		for (; t <= i[a];) a--, t = (e[n] + n * n - (e[r[a]] + r[a] * r[a])) / (2 * (n - r[a]));
		a++, r[a] = n, i[a] = t, i[a + 1] = Infinity;
	}
	a = 0;
	for (let o = 0; o < t; o++) {
		for (; i[a + 1] < o;) a++;
		let t = o - r[a];
		n[o] = t * t + e[r[a]];
	}
}
function ee(e, t, n, r) {
	if (n <= r) return !0;
	let i = Math.imul(e, 668265261) ^ Math.imul(t, 374761393);
	return i = Math.imul(i ^ i >>> 15, 2246822507), i ^= i >>> 13, (i >>> 0) / 4294967296 < r / n;
}
function te(e, t) {
	let n = new Int32Array(e.h + 1), r = [];
	for (let i = 0; i < e.h; i++) {
		n[i] = r.length;
		let a = i * e.w;
		for (let n = 0; n < e.w; n++) {
			if (e.cls[a + n] < t) continue;
			let i = n;
			for (; n + 1 < e.w && e.cls[a + n + 1] >= t;) n++;
			r.push(e.x0 + i, e.x0 + n);
		}
	}
	return n[e.h] = r.length, {
		y0: e.y0,
		h: e.h,
		start: n,
		xs: Int32Array.from(r)
	};
}
function ne(e, t, n, r) {
	let i = Math.max(e.y0, t.y0 - r), a = Math.min(e.y0 + e.h, t.y0 + t.h - r);
	for (let o = i; o < a; o++) {
		let i = e.start[o - e.y0], a = e.start[o - e.y0 + 1], s = t.start[o + r - t.y0], c = t.start[o + r - t.y0 + 1];
		for (; i < a && s < c;) if (e.xs[i + 1] + n < t.xs[s]) i += 2;
		else if (t.xs[s + 1] < e.xs[i] + n) s += 2;
		else return !0;
	}
	return !1;
}
var R = () => ({
	minDx: Infinity,
	maxDx: -Infinity,
	minDy: Infinity,
	maxDy: -Infinity
});
function re(e, t, n) {
	e.minDx = Math.min(e.minDx, t), e.maxDx = Math.max(e.maxDx, t), e.minDy = Math.min(e.minDy, n), e.maxDy = Math.max(e.maxDy, n);
}
function ie(e, t, n) {
	let r = Math.max(g, O(e) * n), i = e.kind === "circle" ? N(e, t, n, r) : P(e.dabs, t, n, r);
	if (!i) return null;
	let a = I(i), o = 0, s = 0;
	for (let e = 0; e < i.cls.length; e++) i.cls[e] === w ? o++ : i.cls[e] === C && (s = Math.max(s, a[e]));
	if (o === 0) return null;
	let c = s + r, l = 0;
	for (let e = 0; e < i.cls.length; e++) i.cls[e] !== w && a[e] <= c && l++;
	if (l === 0) return null;
	let u = D(e), d = u.x * t - .5, f = u.y * n - .5, p = [], m = [], h = [], y = [], b = R(), x = R(), T = R(), E = 0, k = 0, A = 0;
	for (let e = 0; e < i.h; e++) for (let t = 0; t < i.w; t++) {
		let n = e * i.w + t, r = i.cls[n], s = r !== w && a[n] <= c;
		if (r === S && !s) continue;
		let u = i.x0 + t, g = i.y0 + e, C = u - d, D = g - f, O = Math.hypot(C, D);
		re(b, C, D), E = Math.max(E, O), r !== S && (y.push(u, g), re(x, C, D), k = Math.max(k, O)), r === w && (re(T, C, D), A = Math.max(A, O), ee(u, g, o, v) && p.push(u, g)), s && ee(u, g, l, _) && (m.push(u, g), h.push(1 - a[n] / (c + 1)));
	}
	return p.length === 0 || m.length === 0 ? null : {
		ax: d,
		ay: f,
		bandPx: r,
		interior: Int32Array.from(p),
		band: Int32Array.from(m),
		bandWeight: Float32Array.from(h),
		copied: Int32Array.from(y),
		copiedRuns: te(i, C),
		interiorRuns: te(i, w),
		bounds: b,
		copiedBounds: x,
		interiorBounds: T,
		reach: E,
		copiedReach: k,
		interiorReach: A,
		distToInterior: (e, t) => {
			let n = Math.round(e) - i.x0, r = Math.round(t) - i.y0;
			return n < 0 || r < 0 || n >= i.w || r >= i.h ? i.margin : a[r * i.w + n];
		}
	};
}
//#endregion
//#region src/heal-source.ts
var z = null, B = 0, V = 0, H = null;
function ae(e, t, n) {
	z = e, B = t, V = n, H = t > 0 && n > 0 ? new f(e, t, n) : null;
}
function oe(e, t) {
	let n = Math.min(B - 1, Math.max(0, e * B - .5)), r = Math.min(V - 1, Math.max(0, t * V - .5)), i = Math.floor(n), a = Math.floor(r), o = Math.min(B - 1, i + 1), s = Math.min(V - 1, a + 1), c = n - i, l = r - a, u = (a * B + i) * 4, d = (a * B + o) * 4, f = (s * B + i) * 4, p = (s * B + o) * 4, m = [
		0,
		0,
		0
	];
	for (let e = 0; e < 3; e++) {
		let t = z[u + e] + (z[d + e] - z[u + e]) * c, n = z[f + e] + (z[p + e] - z[f + e]) * c;
		m[e] = t + (n - t) * l;
	}
	return m;
}
function se(e, t, n, r, i, a) {
	if (!z || B === 0 || V === 0) return {
		r: 0,
		g: 0,
		b: 0
	};
	let o = Math.max(i * 1.4, .01), s = 0, c = 0, l = 0, u = 0, d = 0, f = 0;
	for (let i = 0; i < 12; i++) {
		let p = i / 12 * Math.PI * 2, m = Math.cos(p) * o / a, h = Math.sin(p) * o, [g, _, v] = oe(e + m, t + h), [y, b, x] = oe(n + m, r + h);
		s += g, c += _, l += v, u += y, d += b, f += x;
	}
	let p = (e) => Math.max(-.5, Math.min(.5, e / 12 / 255));
	return {
		r: p(s - u),
		g: p(c - d),
		b: p(l - f)
	};
}
var ce = 2, le = .5, ue = 1, de = 1, fe = .005, pe = {
	heal: .02,
	clone: 1.5
}, me = 9, he = 1.5, ge = 25, _e = 32, ve = 2.5, ye = 12, be = 4, xe = 4, Se = 8, Ce = 10, we = 72, Te = 64, Ee = 32, De = 16, Oe = 32, ke = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1]
], Ae = [
	.85,
	.92,
	1.09,
	1.18
], je = .3, Me = [5, 2.5], Ne = .85, Pe = [.5, .25], Fe = 1e-6, U = /* @__PURE__ */ new Float64Array(5), W = /* @__PURE__ */ new Float64Array(2), Ie = new Float64Array(Se), G = /* @__PURE__ */ new Float64Array(24), K = /* @__PURE__ */ new Float64Array(24), q = /* @__PURE__ */ new Float64Array(6);
function Le(e, t, n, r) {
	if (r) {
		let r = (n - e.y0) * e.w + (t - e.x0);
		U[0] = e.L[r], U[1] = e.A[r], U[2] = e.B[r], U[3] = e.gx[r], U[4] = e.gy[r];
		return;
	}
	let i = Math.min(e.w - 1, Math.max(0, t - e.x0)), a = Math.min(e.h - 1, Math.max(0, n - e.y0)), o = Math.floor(i), s = Math.floor(a), c = Math.min(e.w - 1, o + 1), l = Math.min(e.h - 1, s + 1), u = i - o, d = a - s, f = s * e.w + o, p = s * e.w + c, m = l * e.w + o, h = l * e.w + c, g = (1 - u) * (1 - d), _ = u * (1 - d), v = (1 - u) * d, y = u * d, b = (e) => e[f] * g + e[p] * _ + e[m] * v + e[h] * y;
	U[0] = b(e.L), U[1] = b(e.A), U[2] = b(e.B), U[3] = b(e.gx), U[4] = b(e.gy);
}
function Re(e, t, n, r, i, a) {
	if (t.angle === 0 && t.scale === 1) {
		W[0] = i + t.tx, W[1] = a + t.ty;
		return;
	}
	let o = i - e.ax, s = a - e.ay, c = 1 / t.scale;
	W[0] = e.ax + t.tx + (n * o + r * s) * c, W[1] = e.ay + t.ty + (-r * o + n * s) * c;
}
function ze(e, t, n, r) {
	let { rr: i } = e, a = i.ax + t.tx, o = i.ay + t.ty, s = e.w - 1 + Fe, c = e.h - 1 + Fe;
	if (n) {
		let e = r ? i.copiedBounds : i.bounds;
		return a + e.minDx >= -1e-6 && a + e.maxDx <= s && o + e.minDy >= -1e-6 && o + e.maxDy <= c;
	}
	let l = (r ? i.copiedReach : i.reach) / t.scale;
	return a - l >= -1e-6 && a + l <= s && o - l >= -1e-6 && o + l <= c;
}
function Be(e, t, n) {
	let { rr: r } = e;
	if (Math.hypot(t.tx, t.ty) > r.interiorReach + r.copiedReach / t.scale + 2) return !1;
	if (n) {
		let e = r.copiedBounds, n = r.interiorBounds;
		return t.tx + e.maxDx < n.minDx - 1 || t.tx + e.minDx > n.maxDx + 1 || t.ty + e.maxDy < n.minDy - 1 || t.ty + e.minDy > n.maxDy + 1 ? !1 : ne(r.copiedRuns, r.interiorRuns, Math.round(t.tx), Math.round(t.ty));
	}
	let i = Math.cos(t.angle), a = Math.sin(t.angle), o = 1 + Math.SQRT1_2;
	for (let e = 0; e < r.copied.length; e += 2) if (Re(r, t, i, a, r.copied[e], r.copied[e + 1]), r.distToInterior(W[0], W[1]) < o) return !0;
	return !1;
}
function Ve(e, t, n) {
	return Math.max(0, Math.log((e + me) / (t + me)) - Math.log(n));
}
function J(e, t, n, r, i) {
	let { rr: a, crop: o } = e, s = t.angle === 0 && t.scale === 1;
	if (!ze(e, t, s, i) || Be(e, t, s)) return Infinity;
	let c = Math.cos(t.angle), l = Math.sin(t.angle), u = 1 / t.scale, d = e.w - 1, f = e.h - 1;
	Ie.fill(0), G.fill(0), K.fill(0);
	let p = 0, m = 0, h = 0, g = 0, _ = 0, v = 0, y = 0, b = 0, x = 0, S = 0, C = 0, w = a.band.length / 2;
	for (let r = 0; r < w; r += n) {
		Re(a, t, c, l, a.band[2 * r], a.band[2 * r + 1]);
		let n = W[0], w = W[1];
		if (i && (n < 0 || w < 0 || n > d || w > f)) continue;
		Le(o, n, w, s);
		let T = a.bandWeight[r], E = 5 * r, D = e.dest[E], O = e.dest[E + 1], k = e.dest[E + 2], A = e.dest[E + 3], j = e.dest[E + 4], M = U[0], N = U[1], P = U[2], F = (c * U[3] - l * U[4]) * u, I = (l * U[3] + c * U[4]) * u;
		p += T, v += T * D, y += T * O, b += T * k, x += T * M, S += T * N, C += T * P, _ += T * (M * M + N * N + P * P), m += T * (A * A + j * j), h += T * (F * F + I * I), g += T * (A * F + j * I);
		let L = e.sector[r];
		Ie[L] += T, G[3 * L] += T * D, G[3 * L + 1] += T * O, G[3 * L + 2] += T * k, K[3 * L] += T * M, K[3 * L + 1] += T * N, K[3 * L + 2] += T * P;
	}
	if (p <= 0) return Infinity;
	q[0] = v / p, q[1] = y / p, q[2] = b / p, q[3] = x / p, q[4] = S / p, q[5] = C / p;
	let T = m / p, E = h / p, D = m > 1e-9 && h > 1e-9 ? g / Math.sqrt(m * h) : 0, O = T / (T + me) * (1 - D), k = 0, A = 0, j = 0;
	for (let e = 0; e < Se; e++) {
		let t = Ie[e];
		if (!(t <= 0)) {
			for (let n = 0; n < 3; n++) {
				let r = G[3 * e + n] / t - q[n], i = K[3 * e + n] / t - q[3 + n];
				k += t * r * r, A += t * (r - i) * (r - i);
			}
			j += t;
		}
	}
	let M = A / j / (k / j + ge), N = q[0] - q[3], P = q[1] - q[4], F = q[2] - q[5], I = Math.sqrt(N * N + P * P + F * F) / _e, L = Math.max(0, _ / p - (q[3] * q[3] + q[4] * q[4] + q[5] * q[5])), ee = ve * Math.sqrt(L) + ye, te = 0, ne = 0, R = 0, re = a.interior.length / 2;
	for (let e = 0; e < re; e += r) {
		Re(a, t, c, l, a.interior[2 * e], a.interior[2 * e + 1]), Le(o, W[0], W[1], s), te += (U[3] * U[3] + U[4] * U[4]) * u * u;
		let n = U[0] - q[3], r = U[1] - q[4], i = U[2] - q[5], d = Math.sqrt(n * n + r * r + i * i);
		d > ee && (ne += (d - ee) / ee), R++;
	}
	let ie = R > 0 ? te / R : E, z = Math.max(Ve(E, T, he), Ve(T, E, he)) + Ve(T, ie, he), B = R > 0 ? be * ne / R : 0, V = Ve(ie, E, xe), H = Math.hypot(t.tx, t.ty) / a.bandPx;
	return ce * O + le * z + ue * M + e.meanWeight * I + de * (B + V) + fe * H;
}
function He(e, t, n, r, i, a, o) {
	let s = e.band.length / 2, c = new Float32Array(5 * s), l = new Uint8Array(s);
	for (let n = 0; n < s; n++) {
		let r = e.band[2 * n], i = e.band[2 * n + 1];
		Le(t, r, i, !0), c.set(U, 5 * n);
		let a = (Math.atan2(i - e.ay, r - e.ax) + Math.PI) / (2 * Math.PI);
		l[n] = Math.min(7, Math.floor(a * Se));
	}
	let u = Ge(e, t, n, r, 0, 0, !1);
	return {
		rr: e,
		crop: t,
		w: n,
		h: r,
		window: i,
		meanWeight: o ? pe[a] : pe.clone,
		rotatable: o,
		dest: c,
		sector: l,
		destTheta: u.theta,
		destCoherence: u.coherence
	};
}
function Ue(e, t, n, r) {
	let i = J(t, n, 1, 1, r);
	return i < e.cost ? {
		...n,
		cost: i
	} : e;
}
function Y(e, t, n, r = 1) {
	let i = {
		...t,
		cost: J(e, t, 1, 1, n)
	};
	for (let t = 0; t < Oe; t++) {
		let t = i;
		for (let [a, o] of ke) {
			let s = i.tx + a * r, c = i.ty + o * r;
			s * s + c * c > e.window * e.window || (t = Ue(t, e, {
				tx: s,
				ty: c,
				angle: i.angle,
				scale: i.scale
			}, n));
		}
		if (t === i) break;
		i = t;
	}
	return i;
}
var We = (e) => Math.atan2(Math.sin(e), Math.cos(e));
function Ge(e, t, n, r, i, a, o) {
	let s = 0, c = 0, l = 0;
	for (let u = 0; u < e.band.length / 2; u++) {
		let d = e.band[2 * u] + i, f = e.band[2 * u + 1] + a;
		if (o && (d < 0 || f < 0 || d > n - 1 || f > r - 1)) continue;
		Le(t, d, f, !0);
		let p = e.bandWeight[u];
		s += p * U[3] * U[3], c += p * U[3] * U[4], l += p * U[4] * U[4];
	}
	return m(s, c, l);
}
function Ke(e, t, n) {
	let r = Ge(e.rr, e.crop, e.w, e.h, t.tx, t.ty, n);
	if (e.destCoherence < je || r.coherence < je) return t;
	let i = e.destTheta - r.theta, a = [i, i + Math.PI].map((e) => ({
		tx: t.tx,
		ty: t.ty,
		angle: We(e),
		scale: 1
	})), o = a.map((t) => J(e, t, 1, 1, n)), s = (o[0] === Infinity && o[1] === Infinity ? a : [a[o[0] <= o[1] ? 0 : 1]]).map((t) => Y(e, t, n)).reduce((e, t) => t.cost < e.cost ? t : e);
	for (let t of Me) {
		let r = s.angle;
		for (let i of [-t, t]) {
			let t = We(r + i * Math.PI / 180);
			s = Ue(s, e, {
				tx: s.tx,
				ty: s.ty,
				angle: t,
				scale: 1
			}, n);
		}
	}
	return s = Y(e, s, n), s.cost > Ne * t.cost ? t : s.angle === 0 ? s : qe(e, s, n);
}
function qe(e, t, n) {
	let r = t;
	for (let t of Pe) r = Y(e, r, n, t);
	return r;
}
function Je(e, t, n) {
	let r = t;
	for (let i of Ae) r = Ue(r, e, {
		tx: t.tx,
		ty: t.ty,
		angle: t.angle,
		scale: i
	}, n);
	return r === t ? t : (r = Y(e, r, n), r.cost <= Ne * t.cost ? r : t);
}
function Ye(e, t, n) {
	return e.destCoherence < je ? t : Je(e, Ke(e, t, n), n);
}
function Xe(e, t) {
	let { rr: n, window: r } = e, i = Math.max(1, Math.round(n.bandPx / 3), Math.ceil(2 * r / we)), a = Math.max(1, Math.floor(n.band.length / 2 / Te)), o = Math.max(1, Math.floor(n.interior.length / 2 / Ee)), s = Math.floor(r / i) * i, c = [];
	for (let n = -s; n <= s; n += i) for (let l = -s; l <= s; l += i) {
		if (l * l + n * n > r * r) continue;
		let i = {
			tx: l,
			ty: n,
			angle: 0,
			scale: 1
		}, s = J(e, i, a, o, t);
		s < Infinity && c.push({
			...i,
			cost: s
		});
	}
	c.sort((e, t) => e.cost - t.cost);
	let l = [];
	for (let e of c) if (l.every((t) => Math.hypot(t.tx - e.tx, t.ty - e.ty) >= n.bandPx) && l.push(e), l.length === De) break;
	let u = null, d = /* @__PURE__ */ new Set();
	for (let n of l) {
		let r = Y(e, n, t), i = `${r.tx},${r.ty}`;
		if (d.has(i)) continue;
		d.add(i);
		let a = e.rotatable ? Ye(e, r, t) : r;
		(!u || a.cost < u.cost) && (u = a);
	}
	return u;
}
function Ze(e, t, n) {
	return [
		e + n / 3 + t / 2,
		e - 2 * n / 3,
		e + n / 3 - t / 2
	];
}
function Qe(e, t, n, r) {
	let i = { ...t.bounds }, a = (e, a, o) => {
		let s = e * n - .5 - t.ax, c = a * r - .5 - t.ay;
		i.minDx = Math.min(i.minDx, s - o), i.maxDx = Math.max(i.maxDx, s + o), i.minDy = Math.min(i.minDy, c - o), i.maxDy = Math.max(i.maxDy, c + o);
	};
	if (e.kind === "circle") a(e.x, e.y, e.radius * r * (1 + e.feather) + t.bandPx);
	else for (let n of e.dabs) n.erase || a(n.x, n.y, n.radius * r + t.bandPx);
	return i;
}
function $e(e, t) {
	if (!H) return null;
	let n = k(e, H.widths[0] / H.heights[0]), r = A(O(e), n, H.heights), i = H.widths[r], a = H.heights[r], o = ie(e, i, a);
	if (!o) return null;
	let s = {
		...o,
		bounds: Qe(e, o, i, a)
	}, c = n * a + Ce * s.bandPx, l = e.kind === "circle" ? s.reach / Ae[0] : 0, u = s.bounds, d = He(s, p(H.pixels(r), s.ax + Math.min(u.minDx, -l) - c - 2, s.ay + Math.min(u.minDy, -l) - c - 2, s.ax + Math.max(u.maxDx, l) + c + 2, s.ay + Math.max(u.maxDy, l) + c + 2), i, a, c, t, e.kind === "circle"), f = !1, m = Xe(d, f);
	if (m ||= (f = !0, Xe(d, f)), !m) return null;
	J(d, m, 1, 1, f);
	let h = Ze(q[0], q[1], q[2]), g = Ze(q[3], q[4], q[5]), _ = (e) => Math.max(-.5, Math.min(.5, (h[e] - g[e]) / 255));
	return {
		x: (s.ax + m.tx + .5) / i,
		y: (s.ay + m.ty + .5) / a,
		angle: m.angle,
		scale: m.scale,
		r: _(0),
		g: _(1),
		b: _(2)
	};
}
//#endregion
//#region src/stages.ts
var et = "safelight.heal.retouch", tt = (e) => e === 1 ? "clamp(textureLod(uImage, sUv, 0.0).rgb + corr, 0.0, 1.0);" : "textureLod(uImage, sUv, 0.0).rgb + corr;\n    // A display-encoded source holds nothing outside [0, 1], and its decode\n    // (srgbToLinear) is undefined below -0.055, which the correction can reach.\n    if (!uLinear) srcCol = clamp(srcCol, 0.0, 1.0);", nt = (e) => `// ---- Retouch: spot heal / clone -------------------------------------------
// Closed-form gradient-domain (membrane) correction for a heal spot. Samples the
// boundary mismatch (destination - source) just outside the disc and interpolates
// it across the interior with inverse-distance (Shepard) weights — a smooth
// low-frequency field that makes the copied source meet its surroundings
// seamlessly even across a tone gradient. This is the per-pixel generalisation of
// the single mean-colour offset carried in uSpotTint. Both terms sample uImage so
// the correction stays in source space (it is added to the source patch, then the
// whole patched image is developed downstream — matching the flat-tint path).
vec3 membraneCorrection(vec2 dst, vec2 src, vec4 tc, float radius, vec2 uv) {
  vec2 q = vec2((uv.x - dst.x) * uImageAspect, uv.y - dst.y); // pixel in aspect space
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  const int N = 16;
  for (int k = 0; k < N; k++) {
    float a = (float(k) + 0.5) / float(N) * 6.2831853;
    vec2 e = vec2(cos(a), sin(a)) * radius * 1.04;       // boundary point (aspect space)
    vec2 dUv = clamp(dst + vec2(e.x / uImageAspect, e.y), 0.0, 1.0);
    // Same inverse rotate+scale the patch fetch uses, so the source boundary point
    // corresponds to the same place in the copied texture.
    float rx = (tc.x * e.x + tc.y * e.y) * tc.z;
    float ry = (-tc.y * e.x + tc.x * e.y) * tc.z;
    vec2 sUv = clamp(src + vec2(rx / uImageAspect, ry), 0.0, 1.0);
    // Explicit LOD: this runs in divergent control flow (inside the per-spot
    // branch), where auto-LOD derivatives are undefined and sample wrong mips.
    vec3 delta = textureLod(uImage, dUv, 0.0).rgb - textureLod(uImage, sUv, 0.0).rgb;
    float dist = length(q - e) + 1e-3;
    float w = 1.0 / (dist * dist);                        // mean-value-style weighting
    acc += delta * w;
    wsum += w;
  }
  return acc / max(wsum, 1e-4);
}

vec3 applyRetouch(vec2 uv, vec3 base) {
  vec3 c = base;
  for (int i = 0; i < MAX_SPOTS; i++) {
    if (i >= uSpotCount) break;
    vec4 a = uSpotA[i];
    vec4 b = uSpotB[i];
    vec2 dst = a.xy;
    vec2 src = a.zw;                  // source-patch centre
    vec4 tc = uSpotC[i];             // cosA, sinA, 1/scale
    float radius = max(b.x, 1e-4);
    float feather = b.y;
    float opacity = b.z;
    // Offset from the spot centre in image-height units (aspect-corrected so the
    // disc stays round on screen).
    float dx = (uv.x - dst.x) * uImageAspect;
    float dy = uv.y - dst.y;
    float dist = length(vec2(dx, dy));
    // The marked radius is fully replaced, so the blemish is removed outright;
    // feather softens the seam by fading out *beyond* the radius rather than
    // carving into the core (which only made the blemish go lighter, not gone).
    // feather=0 -> hard edge; feather=1 -> blend out to 2x the radius.
    float edge = radius * (1.0 + feather);
    if (dist >= edge) continue;
    float w = opacity * (1.0 - smoothstep(radius, edge, dist));
    if (w <= 0.0) continue;
    // Fetch the source with the inverse rotation+scale, so the patch lands
    // rotated by +angle and scaled by +scale to match the surrounding texture.
    float rx = (tc.x * dx + tc.y * dy) * tc.z;
    float ry = (-tc.y * dx + tc.x * dy) * tc.z;
    vec2 sUv = clamp(src + vec2(rx / uImageAspect, ry), 0.0, 1.0);
    // Recolour toward the destination's surroundings so the seam disappears. Heal
    // spots (b.w > 0.5) use the per-pixel gradient-domain membrane; clone spots —
    // and the membrane A/B toggle when off — fall back to the flat mean offset.
    vec3 corr = (uMembraneHeal && b.w > 0.5)
      ? membraneCorrection(dst, src, tc, radius, uv)
      : uSpotTint[i].rgb;
    vec3 srcCol = ${tt(e)}
    c = mix(c, srcCol, w);
  }
  // Brush-shaped retouch: painted coverage from the atlas, one source offset each.
  if (uRetouchCount > 0) {
    vec4 rcov = texture(uRetouchTex, uv);
    for (int i = 0; i < MAX_RBRUSH; i++) {
      if (i >= uRetouchCount) break;
      int ch = uRetouchCh[i];
      float cov = ch == 0 ? rcov.r : (ch == 1 ? rcov.g : (ch == 2 ? rcov.b : rcov.a));
      vec4 rd = uRetouchData[i];
      float w = cov * rd.z;
      if (w <= 0.0) continue;
      vec2 sUv = clamp(uv + rd.xy, 0.0, 1.0);
      vec3 srcCol = texture(uImage, sUv).rgb;
      c = mix(c, srcCol, w);
    }
  }
  return c;
}`, rt = (e, t, n) => ({
	key: e,
	glslType: "vec4",
	length: n,
	size: t,
	default: Array(n * 4).fill(0)
}), it = (e, t) => [...e.flat(), ...Array((t - e.length) * 4).fill(0)], at = (e) => ({
	id: et,
	name: "Heal",
	phase: "geometry",
	anchor: "retouch",
	glsl: "",
	helpers: nt(e),
	defines: {
		MAX_SPOTS: 32,
		MAX_RBRUSH: 4
	},
	uniforms: [
		{
			key: "uSpotCount",
			glslType: "int",
			default: 0
		},
		rt("uSpotA", "MAX_SPOTS", 32),
		rt("uSpotB", "MAX_SPOTS", 32),
		rt("uSpotC", "MAX_SPOTS", 32),
		rt("uSpotTint", "MAX_SPOTS", 32),
		{
			key: "uRetouchCount",
			glslType: "int",
			default: 0
		},
		{
			key: "uRetouchCh",
			glslType: "int",
			length: 4,
			size: "MAX_RBRUSH",
			default: [
				0,
				0,
				0,
				0
			]
		},
		rt("uRetouchData", "MAX_RBRUSH", 4),
		{
			key: "uMembraneHeal",
			glslType: "bool",
			default: !0
		}
	],
	textures: [{
		key: "uRetouchTex",
		kind: "atlas"
	}],
	patch: { active: ["uSpotCount", "uRetouchCount"] },
	derive: ({ retouch: e }) => {
		let t = e.filter((e) => e.visible !== !1), n = t.filter((e) => e.shape !== "brush").slice(0, 32), r = t.flatMap((e) => e.shape === "brush" && e.dabs && e.dabs.length > 0 ? [{
			...e,
			dabs: e.dabs
		}] : []).slice(0, 4), i = (e, t) => e.mode === "clone" ? 0 : t ?? 0;
		return {
			uSpotCount: n.length,
			uSpotA: it(n.map((e) => [
				e.dstX,
				e.dstY,
				e.srcX,
				e.srcY
			]), 32),
			uSpotB: it(n.map((e) => [
				e.radius,
				e.feather / 100,
				e.opacity / 100,
				e.mode === "clone" ? 0 : 1
			]), 32),
			uSpotC: it(n.map((e) => [
				Math.cos(e.angle ?? 0),
				Math.sin(e.angle ?? 0),
				1 / (e.scale || 1),
				0
			]), 32),
			uSpotTint: it(n.map((e) => [
				i(e, e.recolorR),
				i(e, e.recolorG),
				i(e, e.recolorB),
				0
			]), 32),
			uRetouchCount: r.length,
			uRetouchCh: [
				0,
				1,
				2,
				3
			],
			uRetouchData: it(r.map((e) => [
				e.srcX - e.dstX,
				e.srcY - e.dstY,
				e.opacity / 100,
				0
			]), 4),
			uRetouchTex: r.map((e) => ({
				id: e.id,
				dabs: e.dabs
			}))
		};
	}
}), ot = {
	size: .04,
	feather: 50,
	opacity: 100,
	mode: "heal",
	selectedSpotId: null,
	preview: !1
}, st = ot, ct = /* @__PURE__ */ new Set(), lt = () => st;
function X(e) {
	st = {
		...st,
		...e
	};
	for (let e of ct) e();
}
var ut = () => X(ot), dt = (e) => (ct.add(e), () => void ct.delete(e)), ft = () => e.useSyncExternalStore(dt, lt), pt = () => t.stores.useDevelopStore.getState().params.retouch, mt = (e) => t.stores.useDevelopStore.getState().setParam("retouch", e);
function ht(e) {
	pt().length >= 32 || (mt([...pt(), e]), X({ selectedSpotId: e.id }));
}
function Z(e, t) {
	mt(pt().map((n) => n.id === e ? {
		...n,
		...t
	} : n));
}
function gt(e) {
	mt(pt().filter((t) => t.id !== e)), st.selectedSpotId === e && X({ selectedSpotId: null });
}
//#endregion
//#region src/HealCanvas.tsx
var _t = 0, vt = (e) => `${e}-${Date.now().toString(36)}-${_t++}`;
function yt(e, n, r) {
	let i = t.stores.useSettings.getState().uiScale || 1;
	return {
		x: (n - e.left) / i,
		y: (r - e.top) / i
	};
}
function bt(e, t = 4) {
	if (e.length === 0) return "";
	let n = Infinity, r = Infinity, i = -Infinity, a = -Infinity;
	for (let t of e) n = Math.min(n, t.x - t.r), r = Math.min(r, t.y - t.r), i = Math.max(i, t.x + t.r), a = Math.max(a, t.y + t.r);
	n -= t, r -= t, i += t, a += t;
	let o = Math.max(1, Math.ceil((i - n) / t)), s = Math.max(1, Math.ceil((a - r) / t)), c = (i, a) => {
		let o = n + i * t, s = r + a * t, c = -Infinity;
		for (let t of e) {
			let e = o - t.x, n = s - t.y, r = t.r * t.r - (e * e + n * n);
			r > c && (c = r);
		}
		return c;
	}, l = "", u = new Float64Array(o + 1);
	for (let e = 0; e <= o; e++) u[e] = c(e, 0);
	for (let e = 0; e < s; e++) {
		let i = new Float64Array(o + 1);
		for (let t = 0; t <= o; t++) i[t] = c(t, e + 1);
		let a = r + e * t, s = a + t;
		for (let e = 0; e < o; e++) {
			let r = u[e], o = u[e + 1], c = i[e], d = i[e + 1], f = r >= 0 | (o >= 0 ? 2 : 0) | (d >= 0 ? 4 : 0) | (c >= 0 ? 8 : 0);
			if (f === 0 || f === 15) continue;
			let p = n + e * t, m = p + t, h = () => [p + r / (r - o) * t, a], g = () => [m, a + o / (o - d) * t], _ = () => [p + c / (c - d) * t, s], v = () => [p, a + r / (r - c) * t], y = (e, t) => {
				l += `M${e[0].toFixed(1)} ${e[1].toFixed(1)}L${t[0].toFixed(1)} ${t[1].toFixed(1)}`;
			};
			switch (f) {
				case 1:
				case 14:
					y(v(), h());
					break;
				case 2:
				case 13:
					y(h(), g());
					break;
				case 3:
				case 12:
					y(v(), g());
					break;
				case 4:
				case 11:
					y(g(), _());
					break;
				case 6:
				case 9:
					y(h(), _());
					break;
				case 7:
				case 8:
					y(v(), _());
					break;
				case 5:
					y(v(), h()), y(g(), _());
					break;
				case 10: y(h(), g()), y(_(), v());
			}
		}
		u = i;
	}
	return l;
}
function xt(e, t, n, r, a) {
	let o = i(n, r, a), s = (o.x - t.x) / t.width, c = (o.y - t.y) / t.height;
	return {
		x: e.x + s * e.w,
		y: e.y + c * e.h
	};
}
var St = (e, t, n) => n / t.height * e.h, Ct = /* @__PURE__ */ new WeakMap();
function wt(e, t, n) {
	let { x: r, y: i, w: a, h: o } = e;
	return [
		r,
		i,
		a,
		o,
		t.x,
		t.y,
		t.width,
		t.height,
		...n
	].join(",");
}
var Tt = 13;
function Et() {
	let e = {
		at: null,
		dragging: !1
	}, t = /* @__PURE__ */ new Set();
	return {
		get: () => e,
		set(n) {
			e = {
				...e,
				...n
			};
			for (let e of t) e();
		},
		subscribe(e) {
			return t.add(e), () => void t.delete(e);
		}
	};
}
function Dt({ pointer: t, radius: n }) {
	let { at: r, dragging: i } = e.useSyncExternalStore(t.subscribe, t.get);
	return !r || i ? null : /* @__PURE__ */ e.createElement("circle", {
		cx: r.x,
		cy: r.y,
		r: Math.max(3, n),
		fill: "none",
		stroke: "#e0e0e0",
		strokeWidth: 1,
		opacity: .8
	});
}
function Ot({ rect: n }) {
	let r = t.stores.useDevelopStore, a = r((e) => e.params.retouch), o = r((e) => e.params.straighten), s = r((e) => e.params.transform), c = r((e) => e.params.crop), { region: l, imageAspect: f } = t.develop.useDevelopOverlay(), p = ft(), [m] = e.useState(Et), h = e.useRef(null), g = l ?? c, _ = e.useMemo(() => d(o, s, f), [
		o,
		s,
		f
	]), v = e.useMemo(() => u(o, s, f), [
		o,
		s,
		f
	]), y = (e, t) => {
		let r = (e - n.x) / n.w, a = (t - n.y) / n.h;
		return i(v, g.x + r * g.width, g.y + a * g.height);
	}, b = (e, t) => xt(n, g, _, e, t), x = (e) => St(n, g, e), S = (e) => yt(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY), C = () => r.getState().params;
	function w(e, t) {
		for (let n = a.length - 1; n >= 0; n--) {
			let r = a[n];
			if (r.shape === "brush" && r.dabs) {
				let n = r.srcX - r.dstX, i = r.srcY - r.dstY;
				for (let a of r.dabs) {
					let o = b(a.x + n, a.y + i);
					if (Math.hypot(e - o.x, t - o.y) <= Math.max(Tt, x(a.radius))) return {
						kind: "spot-src",
						id: r.id
					};
				}
			} else {
				let n = b(r.srcX, r.srcY);
				if (Math.hypot(e - n.x, t - n.y) <= Math.max(Tt, x(r.radius))) return {
					kind: "spot-src",
					id: r.id
				};
			}
			if (r.shape === "brush" && r.dabs) for (let n of r.dabs) {
				let i = b(n.x, n.y);
				if (Math.hypot(e - i.x, t - i.y) <= Math.max(Tt, x(n.radius))) return {
					kind: "spot-dst",
					id: r.id
				};
			}
			else {
				let n = b(r.dstX, r.dstY);
				if (Math.hypot(e - n.x, t - n.y) <= Math.max(Tt, x(r.radius))) return {
					kind: "spot-dst",
					id: r.id
				};
			}
		}
		return null;
	}
	let E = (e) => {
		if (e.button !== 0) return;
		let { x: t, y: n } = S(e);
		e.currentTarget.setPointerCapture(e.pointerId);
		let r = y(t, n);
		m.set({ dragging: !0 });
		let i = w(t, n);
		if (i) {
			X({ selectedSpotId: i.id }), h.current = {
				kind: i.kind,
				id: i.id,
				downSrc: r
			};
			return;
		}
		let a = lt(), o = vt("spot"), s = Math.max(.04, a.size * 1.5), c = {
			x: r.x,
			y: r.y,
			radius: a.size,
			erase: !1,
			feather: a.feather / 100
		};
		ht({
			id: o,
			shape: "brush",
			mode: a.mode,
			visible: !0,
			dstX: r.x,
			dstY: r.y,
			srcX: r.x - s / f,
			srcY: r.y - s,
			radius: a.size,
			feather: a.feather,
			opacity: a.opacity,
			angle: 0,
			scale: 1,
			recolorR: 0,
			recolorG: 0,
			recolorB: 0,
			dabs: [c]
		}), h.current = {
			kind: "paint",
			id: o,
			downSrc: r,
			lastDab: r,
			dabs: [c]
		};
	}, O = (e) => {
		let { x: t, y: n } = S(e);
		m.set({ at: {
			x: t,
			y: n
		} });
		let r = h.current;
		if (!r) return;
		let i = y(t, n);
		switch (r.kind) {
			case "paint": {
				let e = lt(), t = r.lastDab ?? r.downSrc;
				Math.hypot((i.x - t.x) * f, i.y - t.y) >= e.size * .25 && r.dabs && (r.dabs.push({
					x: i.x,
					y: i.y,
					radius: e.size,
					erase: !1,
					feather: e.feather / 100
				}), Z(r.id, { dabs: [...r.dabs] }), r.lastDab = i);
				break;
			}
			case "spot-dst": {
				let e = C().retouch.find((e) => e.id === r.id);
				if (e) {
					let t = i.x - r.downSrc.x, n = i.y - r.downSrc.y, a = {
						dstX: e.dstX + t,
						dstY: e.dstY + n,
						srcX: e.srcX + t,
						srcY: e.srcY + n
					};
					e.dabs && (a.dabs = e.dabs.map((e) => ({
						...e,
						x: e.x + t,
						y: e.y + n
					}))), Z(r.id, a), r.downSrc = i;
				}
				break;
			}
			case "spot-src": {
				let e = C().retouch.find((e) => e.id === r.id);
				if (e) {
					let t = i.x - r.downSrc.x, n = i.y - r.downSrc.y, a = e.srcX + t, o = e.srcY + n, s = {
						srcX: a,
						srcY: o,
						angle: 0,
						scale: 1
					};
					if (e.mode !== "clone") {
						let t = se(e.dstX, e.dstY, a, o, e.radius, f);
						s.recolorR = t.r, s.recolorG = t.g, s.recolorB = t.b;
					}
					Z(r.id, s), r.downSrc = i;
				}
				break;
			}
		}
	};
	function k(e) {
		let t = C().retouch.find((t) => t.id === e);
		if (!t) return;
		let n = T(t), r = {}, i = $e(n, t.mode);
		if (i) {
			let a = D(n);
			r.srcX = t.dstX + (i.x - a.x), r.srcY = t.dstY + (i.y - a.y), r.angle = i.angle, r.scale = i.scale, t.mode !== "clone" && (r.recolorR = i.r, r.recolorG = i.g, r.recolorB = i.b), Z(e, r);
			return;
		}
		let a = t.radius;
		if (n.kind === "brush") {
			let e = D(n);
			a = 0;
			for (let t of n.dabs) a = Math.max(a, Math.hypot((t.x - e.x) * f, t.y - e.y) + t.radius);
		}
		let o = Math.max(.04, a * 2.2);
		r.srcX = t.dstX - o / f, r.srcY = t.dstY - o, Z(e, r);
	}
	let A = () => {
		let e = h.current;
		h.current = null, m.set({ dragging: !1 }), e && (e.kind === "paint" && (e.dabs && e.dabs.length <= 1 && Z(e.id, {
			shape: "circle",
			dabs: void 0
		}), k(e.id)), r.getState().commitEdit("Retouch"));
	}, j = St(n, g, p.size), M = jt(), N = n.x + n.w / 2, P = n.y + n.h / 2;
	return /* @__PURE__ */ e.createElement("div", {
		"data-heal-canvas": "",
		style: {
			position: "absolute",
			inset: 0,
			cursor: t.cursors.resolve("crosshair"),
			touchAction: "none"
		},
		onPointerDown: E,
		onPointerMove: O,
		onPointerUp: A,
		onPointerLeave: () => m.set({ at: null })
	}, /* @__PURE__ */ e.createElement("svg", { style: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		pointerEvents: "none"
	} }, /* @__PURE__ */ e.createElement(M, {
		spots: a,
		selectedSpotId: p.selectedSpotId,
		rect: n,
		crop: g,
		forward: _
	}), p.preview && /* @__PURE__ */ e.createElement("g", { opacity: .8 }, /* @__PURE__ */ e.createElement("circle", {
		cx: N,
		cy: P,
		r: Math.max(3, j),
		fill: "none",
		stroke: "#fff",
		strokeWidth: 1.2
	}), /* @__PURE__ */ e.createElement("circle", {
		cx: N,
		cy: P,
		r: Math.max(1, j * (1 - p.feather / 100)),
		fill: "none",
		stroke: "#fff",
		strokeWidth: .6,
		opacity: .5
	})), /* @__PURE__ */ e.createElement(Dt, {
		pointer: m,
		radius: j
	})));
}
function kt({ spots: t, selectedSpotId: n, rect: r, crop: i, forward: a }) {
	let o = (e, t) => xt(r, i, a, e, t), s = (e) => St(r, i, e), c = wt(r, i, a), l = (e, t) => {
		let n = Ct.get(e);
		if (n?.sig === c) return n.path;
		let r = bt(t.map((e) => {
			let t = o(e.x, e.y);
			return {
				x: t.x,
				y: t.y,
				r: s(e.radius)
			};
		}));
		return Ct.set(e, {
			sig: c,
			path: r
		}), r;
	};
	return /* @__PURE__ */ e.createElement(e.Fragment, null, t.map((t) => {
		let r = o(t.srcX, t.srcY), i = o(t.dstX, t.dstY), a = s(t.radius), c = t.id === n, u = "#e0e0e0";
		if (t.shape === "brush" && t.dabs && t.dabs.length > 0) {
			let n = l(t, t.dabs), a = r.x - i.x, o = r.y - i.y;
			return /* @__PURE__ */ e.createElement("g", {
				key: t.id,
				"data-spot": t.id
			}, /* @__PURE__ */ e.createElement("line", {
				x1: r.x,
				y1: r.y,
				x2: i.x,
				y2: i.y,
				stroke: u,
				strokeWidth: 1,
				strokeDasharray: "3 3",
				opacity: .7
			}), /* @__PURE__ */ e.createElement("path", {
				d: n,
				fill: "none",
				stroke: u,
				strokeWidth: 1,
				strokeDasharray: "2 2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				opacity: .8,
				transform: `translate(${a} ${o})`
			}), /* @__PURE__ */ e.createElement("path", {
				d: n,
				fill: "none",
				stroke: u,
				strokeWidth: c ? 2 : 1.2,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}));
		}
		return /* @__PURE__ */ e.createElement("g", {
			key: t.id,
			"data-spot": t.id
		}, /* @__PURE__ */ e.createElement("line", {
			x1: r.x,
			y1: r.y,
			x2: i.x,
			y2: i.y,
			stroke: u,
			strokeWidth: 1,
			strokeDasharray: "3 3",
			opacity: .7
		}), /* @__PURE__ */ e.createElement("circle", {
			cx: r.x,
			cy: r.y,
			r: a,
			fill: "none",
			stroke: u,
			strokeWidth: 1,
			strokeDasharray: "2 2"
		}), /* @__PURE__ */ e.createElement("circle", {
			cx: i.x,
			cy: i.y,
			r: a,
			fill: "none",
			stroke: u,
			strokeWidth: c ? 2 : 1.2
		}));
	}));
}
var At = null, jt = () => At ??= e.memo(kt), Mt = (e) => Math.max(.01, Math.min(.3, Number(e.toFixed(3)))), Nt = {
	overlay: Ot,
	zoomable: !0,
	onEscape: () => X({ selectedSpotId: null }),
	onAction: (e) => {
		if (e !== "brush.smaller" && e !== "brush.larger") return !1;
		let t = e === "brush.larger" ? 1 : -1;
		return X({ size: Mt(lt().size + t * .005) }), !0;
	}
}, Q = "safelight-heal", $ = {
	panel: `${Q}-panel`,
	head: `${Q}-head`,
	toggle: `${Q}-toggle`,
	hint: `${Q}-hint`,
	defaults: `${Q}-defaults`,
	caption: `${Q}-caption`,
	modes: `${Q}-modes`,
	mode: `${Q}-mode`,
	on: `${Q}-on`,
	list: `${Q}-list`,
	spot: `${Q}-spot`,
	eye: `${Q}-eye`,
	hidden: `${Q}-hidden`,
	name: `${Q}-name`,
	remove: `${Q}-remove`
}, Pt = (e, t) => `color-mix(in srgb, ${e} ${t}%, transparent)`;
function Ft(e) {
	return `
:where(.${$.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${$.head}) { display: flex; align-items: center; justify-content: space-between; }
:where(.${$.toggle}) { border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 11px; background-color: ${e.surface2}; color: ${e.textSecondary}; }
:where(.${$.toggle}:hover) { color: ${e.textPrimary}; }
:where(.${$.toggle}.${$.on}) { background-color: ${Pt(e.accent, 30)}; color: ${e.textPrimary}; }
:where(.${$.hint}) { font-size: 10px; color: ${e.textMuted}; }
:where(.${$.defaults}) { border-radius: 0.25rem; background-color: ${Pt(e.surface2, 50)}; padding: 0.375rem; }
:where(.${$.defaults} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${$.caption}) { padding-bottom: 0.125rem; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${e.textMuted}; }
:where(.${$.modes}) { display: flex; gap: 0.25rem; padding-bottom: 0.25rem; }
:where(.${$.mode}) { flex: 1 1 0%; border-radius: 0.25rem; padding: 0.125rem 0.5rem; font-size: 10px; text-transform: capitalize; background-color: ${e.surface2}; color: ${e.textSecondary}; }
:where(.${$.mode}:hover) { color: ${e.textPrimary}; }
:where(.${$.mode}.${$.on}) { background-color: ${Pt(e.accent, 30)}; color: ${e.textPrimary}; }
:where(.${$.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${$.spot}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${$.spot}:hover) { background-color: ${e.surface2}; }
:where(.${$.spot}.${$.on}) { background-color: ${Pt(e.accent, 20)}; color: ${e.textPrimary}; }
:where(.${$.eye}) { flex-shrink: 0; border-radius: 0.25rem; padding: 0 0.125rem; color: ${e.textMuted}; }
:where(.${$.eye}.${$.hidden}) { color: ${Pt(e.textMuted, 40)}; }
:where(.${$.eye}:hover) { color: ${e.textPrimary}; }
:where(.${$.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${$.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${e.textMuted}; }
:where(.${$.remove}:hover) { color: ${e.labelRed}; }
html.sl-larger-text .${$.hint}, html.sl-larger-text .${$.caption}, html.sl-larger-text .${$.mode} { font-size: 12px !important; }
html.sl-larger-text .${$.toggle}, html.sl-larger-text .${$.spot} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${$.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
//#endregion
//#region src/HealPanel.tsx
function It() {
	let { Panel: n, Slider: r } = t.components, i = t.stores.useDevelopStore, a = i((e) => e.params.retouch), o = i((e) => e.commitEdit), s = t.develop.useCanvasToolHeld(), c = ft(), l = a.find((e) => e.id === c.selectedSpotId) ?? null, u = Math.round((l ? l.radius : c.size) * 100), d = l ? l.feather : c.feather, f = l ? l.opacity : c.opacity, p = l ? l.mode : c.mode, m = (e) => {
		X({ preview: !0 }), l ? Z(l.id, { radius: e / 100 }) : X({ size: e / 100 });
	}, h = (e) => {
		X({ preview: !0 }), l ? Z(l.id, { feather: e }) : X({ feather: e });
	}, g = (e) => {
		l ? Z(l.id, { opacity: e }) : X({ opacity: e });
	}, _ = (e) => {
		l ? (Z(l.id, { mode: e }), o("Spot Mode")) : X({ mode: e });
	}, v = (e) => () => {
		X({ preview: !1 }), l && o(e);
	}, y = (e, t) => {
		Z(e, { visible: !t }), o("Spot Visibility");
	}, b = (e) => e ? ` ${$.on}` : "";
	return /* @__PURE__ */ e.createElement(n, {
		title: "Heal",
		defaultOpen: !0
	}, /* @__PURE__ */ e.createElement("div", { className: $.panel }, /* @__PURE__ */ e.createElement("div", { className: $.head }, /* @__PURE__ */ e.createElement("button", {
		type: "button",
		className: $.toggle + b(s),
		onClick: () => {
			s ? (t.develop.setCanvasTool(null), X({ selectedSpotId: null })) : t.develop.setCanvasTool(Nt);
		}
	}, s ? "Done" : "Heal"), /* @__PURE__ */ e.createElement("span", { className: $.hint }, s ? "Click or drag · drag the source ring to resample" : `${a.length}/32 spots`)), /* @__PURE__ */ e.createElement("div", { className: $.defaults }, /* @__PURE__ */ e.createElement("div", { className: $.caption }, l ? "Editing spot" : "New spot defaults"), /* @__PURE__ */ e.createElement("div", { className: $.modes }, ["heal", "clone"].map((t) => /* @__PURE__ */ e.createElement("button", {
		key: t,
		type: "button",
		className: $.mode + b(p === t),
		onClick: () => _(t)
	}, t))), /* @__PURE__ */ e.createElement(r, {
		label: "Size",
		value: u,
		min: 1,
		max: 30,
		step: 1,
		defaultValue: 4,
		onChange: m,
		onCommit: v("Spot Size")
	}), /* @__PURE__ */ e.createElement(r, {
		label: "Feather",
		value: d,
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 50,
		onChange: h,
		onCommit: v("Spot Feather")
	}), /* @__PURE__ */ e.createElement(r, {
		label: "Opacity",
		value: f,
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		onChange: g,
		onCommit: () => {
			l && o("Spot Opacity");
		}
	})), a.length > 0 && /* @__PURE__ */ e.createElement("div", { className: $.list }, a.map((n, r) => {
		let i = n.visible !== !1;
		return /* @__PURE__ */ e.createElement("div", {
			key: n.id,
			className: $.spot + b(n.id === c.selectedSpotId),
			onClick: () => {
				X({ selectedSpotId: n.id }), t.develop.setCanvasTool(Nt);
			}
		}, /* @__PURE__ */ e.createElement("button", {
			type: "button",
			title: i ? "Hide" : "Show",
			className: $.eye + (i ? "" : ` ${$.hidden}`),
			onClick: (e) => {
				e.stopPropagation(), y(n.id, i);
			}
		}, i ? "◉" : "○"), /* @__PURE__ */ e.createElement("span", { className: $.name }, n.mode === "clone" ? "Clone" : "Heal", " ", r + 1), /* @__PURE__ */ e.createElement("button", {
			type: "button",
			title: "Delete",
			className: $.remove,
			onClick: (e) => {
				e.stopPropagation(), gt(n.id), o("Delete Spot");
			}
		}, "×"));
	}))));
}
//#endregion
//#region src/index.tsx
var Lt = "core.retouch", Rt = "safelight.heal.styles", zt = 3, Bt = [];
function Vt(e) {
	n(e), ut(), e.registerStylesheet({
		id: Rt,
		css: Ft(e.ui.tokens)
	}), e.registerProcessingStage(at(3)), e.registerPanel({
		id: Lt,
		title: "Heal",
		component: It,
		defaultDock: {
			module: "develop",
			direction: "left",
			order: 1,
			width: 240,
			height: 160
		},
		onReset: () => {
			X({ selectedSpotId: null }), e.stores.useDevelopStore.getState().resetParams(["retouch"], "Reset Heal");
		}
	});
	for (let e of Bt) e();
	let t = e.develop.sourcePixels();
	t && ae(t.data, t.width, t.height), Bt = [e.develop.onSourcePixels((e) => ae(e.data, e.width, e.height)), e.stores.useDevelopStore.subscribe((t, n) => {
		t.photoId !== n.photoId && (X({ selectedSpotId: null }), e.develop.setCanvasTool(null));
	})];
}
function Ht() {
	for (let e of Bt) e();
	Bt = [], ut();
}
//#endregion
export { zt as LINE, Lt as PANEL_ID, Rt as STYLESHEET_ID, Vt as activate, Ht as deactivate };

//# sourceMappingURL=index.js.map