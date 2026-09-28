import useIsBrowser from '@docusaurus/useIsBrowser';
import {useHistory, useLocation} from '@docusaurus/router';
import {defaultRole, profiles, resolveRole, type CareerRole} from './profiles';

export default function useCareerProfile() {
  const location = useLocation();
  const history = useHistory();
  // Static HTML and hydration both start with the default, then resolve the shared URL.
  const isBrowser = useIsBrowser();
  const role = isBrowser ? resolveRole(new URLSearchParams(location.search).get('role')) : defaultRole;
  function setRole(next: CareerRole) {
    const query = new URLSearchParams(location.search);
    query.set('role', next);
    history.push({...location, search: `?${query}`, hash: ''});
  }
  return {role, profile: profiles[role], setRole, ready: isBrowser};
}
