import * as stats from '@must-iq-web/lib/api/admin/stats';
import * as teams from '@must-iq-web/lib/api/admin/teams';
import * as users from '@must-iq-web/lib/api/admin/users';
import * as workspaces from '@must-iq-web/lib/api/admin/workspaces';
import * as ingestion from '@must-iq-web/lib/api/admin/ingestion';
import * as settings from '@must-iq-web/lib/api/admin/settings';
import * as tokens from '@must-iq-web/lib/api/admin/tokens';
import * as audit from '@must-iq-web/lib/api/admin/audit';

export const adminApi = {
    ...stats,
    ...teams,
    ...users,
    ...workspaces,
    ...ingestion,
    ...settings,
    ...tokens,
    ...audit,
};
