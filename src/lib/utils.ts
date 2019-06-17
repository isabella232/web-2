/**
 * Safe dot-property getter for `obj`: returns value of `obj` by given `key`,
 * separated by `.`, but doesn’t throw error if any of the property key exists
 */
export function get<T = any>(obj: any, key: string | string[], defaultValue?: T): T {
	let result = obj;
	if (typeof key === 'string') {
		key = key.split('.');
	}

	for (const k of key) {
		if (result == null) {
			break;
		}

		result = result[k];
	}

	return result != null ? result : defaultValue;
}

/**
 * Stores given `value` in `obj` by nested `key` in immutable fashion: all
 * intermediate objects will be re-created
 */
export function set(obj: any, key: string | string[], value: any): any {
	if (typeof key === 'string') {
		key = key.split('.');
	}

	if (!key.length || get(obj, key) === value) {
		return obj;
	}

	let ctx = obj = copy(obj);
	for (let i = 0, k; i < key.length - 1; i++) {
		k = key[i];
		ctx = ctx[k] = copy(ctx[k]);
	}

	ctx[key[key.length - 1]] = value;
	return obj;
}

/**
 * Creates a copy of given object
 */
function copy<T>(obj: T): T {
	if (obj == null) {
		return {} as T;
	}

	if (Array.isArray(obj)) {
		return obj.slice() as any as T;
	}

	return { ...obj };
}

/**
 * Check if two given objects are identical
 * @param {Object} a
 * @param {Object} b
 * @returns {Boolean}
 */
export function objectsEqual(a: any, b: any): boolean {
	if (!a || !b) {
		return false;
	}

	const keysA = Object.keys(a);
	if (keysA.length !== Object.keys(b).length) {
		return false;
	}

	for (let i = 0, key; i < keysA.length; i++) {
		key = keysA[i];
		if (a[key] !== b[key]) {
			return false;
		}
	}

	return true;
}
