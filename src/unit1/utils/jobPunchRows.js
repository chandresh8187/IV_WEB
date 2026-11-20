import {groupPunchRequirements} from './punchRequirements.js'
export function jobPunchRows(job){return groupPunchRequirements(job).map(row=>({...row,punch:row.punchName||'Legacy'}))}
