/**
 * What this user can do in the CMS. The panel hides what the user cannot use.
 *
 * `can_create` and `can_manage` come from the CMS-wide roles. Only a System
 * Manager or a Website Manager `is_manager`, and only a manager gets the roles.
 */

import { api } from "../data/api.js";
import { cached, forget } from "../data/cache.js";

export const getAccess = () => cached("access", api.getAccess);

/** A role made in Desk shows up when the user comes back to this frame. */
export const forgetAccess = () => forget("access");

/** The CMS-wide roles reach every collection, so the collections are read again. */
export const saveCmsRoles = async (roles) => {
	const saved = await api.updateCmsRoles(roles);
	forget("access", "collections");
	return saved;
};
