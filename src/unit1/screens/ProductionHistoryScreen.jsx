import ProductionEntryEditor from '../components/ProductionEntryEditor';
import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CalendarDays, ChevronRight, FileText, Search, RefreshCw, Pencil } from 'lucide-react';
import LoadingIndicator from '../../components/LoadingIndicator';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { getProductionHistoryDates, getProductionHistory, getHistoryHoleChecksPdf, getJobCard, getLiveProduction, getProductionHistoryPdf } from '../api/productionApi';
import { todayIso, formatDate, formatTime } from '../utils/dateTime';
import { getCoil, getPhysicalCoil } from '../api/coilApi';
import { formatCoilRate } from '../utils/coilRate';
import { MATERIAL_LABELS } from '../data/materialGrades';
import { hasAccess } from '../utils/access';
import { JobCardDetails } from './JobCardsScreen';
import ProductionCoilLink from '../components/ProductionCoilLink';
import HistoryHoleChecks from '../components/HistoryHoleChecks';
import './ProductionHistoryScreen.css';
var number = e => Number(e || 0).toLocaleString(`en-IN`),
  weight = e => e == null ? '—' : `${Number(e).toLocaleString(`en-IN`, {
    maximumFractionDigits: 2
  })} kg`,
  errorText = e => e?.response?.data?.error || e?.response?.data?.message || e?.message || `Could not load production history.`;
function ProductionHistoryScreen() {
 const [editing,setEditing]=React.useState(null);
  let navigate = useNavigate(),
    restoredHistory = useLocation().state?.historyReport || {},
    user = useSelector(e => e.auth.user),
    [date, setDate] = React.useState(restoredHistory.date || todayIso()),
    [selectedDate, setSelectedDate] = React.useState(restoredHistory.date || null),
    [month, setMonth] = React.useState(todayIso().slice(0, 7)),
    [shift, setShift] = React.useState(restoredHistory.shift || `all`),
    [machineId, setMachineId] = React.useState(restoredHistory.machineId || ``),
    [page, setPage] = React.useState(restoredHistory.page || 1),
    [activeView, setActiveView] = React.useState(restoredHistory.activeView || `production`),
    [coil, setCoil] = React.useState(null),
    [job, setJob] = React.useState(null),
    dates = useQuery({
      queryKey: [`unit1-history-dates`],
      queryFn: getProductionHistoryDates
    }),
    live = useQuery({
      queryKey: [`production-live`],
      queryFn: getLiveProduction
    }),
    history = useQuery({
      queryKey: [`unit1-history`, selectedDate, shift, machineId, page],
      queryFn: () => getProductionHistory({
        date: selectedDate,
        shift: shift,
        machineId: machineId,
        page: page
      }),
      enabled: !!selectedDate
    }),
    selectDate = e => {
      setSelectedDate(e), setDate(e), setPage(1), setShift(`all`), setMachineId(``), setActiveView(`production`);
    },
    viewCoil = async (e, t) => {
      if (hasAccess(user, `unit1.coils.view`)) try {
        setCoil(await (t ? getPhysicalCoil(e, t) : getCoil(e)));
      } catch (e) {
        window.alert(errorText(e));
      }
    },
    viewJob = async e => {
      try {
        setJob(await getJobCard(e));
      } catch (e) {
        window.alert(errorText(e));
      }
    },
    [generating, setGenerating] = React.useState(!1),
    [reportError, setReportError] = React.useState(``),
    openReport = async t => {
      setGenerating(!0), setReportError(``);
      try {
        let n = t === `holes` ? await getHistoryHoleChecksPdf(selectedDate, {
          shift: shift,
          machineId: machineId
        }) : await getProductionHistoryPdf({
          date: selectedDate,
          shift: shift,
          machineId: machineId
        });
        navigate(`/production/history`, {
          replace: !0,
          state: {
            historyReport: {
              date: selectedDate,
              shift: shift,
              machineId: machineId,
              page: page,
              activeView: activeView
            }
          }
        }), navigate(`/production/reports/preview`, {
          state: {
            blob: n,
            filename: `unit1-` + (t === `holes` ? `hole-checks-all-` : `production-`) + selectedDate + `.pdf`,
            reportTitle: t === `holes` ? `Hole inspection report` : `Production report`,
            returnTo: `/production/history`,
            returnState: {
              historyReport: {
                date: selectedDate,
                shift: shift,
                machineId: machineId,
                page: page,
                activeView: activeView
              }
            }
          }
        });
      } catch (e) {
        let t = errorText(e);
        if (e.response?.data instanceof Blob) try {
          t = JSON.parse(await e.response.data.text()).error || t;
        } catch {// Keep the original response message if the error body is not JSON.
        }
        setReportError(t);
      } finally {
        setGenerating(!1);
      }
    },
    data = history.data,
    totalPages = Math.max(1, Math.ceil(Number(data?.total || 0) / Number(data?.pageSize || 50))),
    visibleDates = dates.data?.filter(e => String(e.shiftDate).slice(0, 7) === month) || [];
  return <section className={`production-history-page`}>{selectedDate ? <>
<section className="u1-history-controls" aria-label="History filters">
<div className={`u1-history-toolbar`}>
<div className="u1-history-title">
<CalendarDays size={21} aria-hidden="true" />
<h1>{formatDate(selectedDate)}</h1>
</div>
<div className="u1-history-actions">
<button className={`outline-button`} type={`button`} onClick={() => setSelectedDate(null)}>{`Change date`}</button>
<button className={`outline-button`} type={`button`} onClick={() => {
            history.refetch(), dates.refetch();
          }} disabled={history.isFetching}>
<RefreshCw size={16} />{`Refresh`}</button>
</div>
</div>
<div className={`u1-history-filters`}>
<label>{`Shift`}<select value={shift} onChange={e => {
            setShift(e.target.value), setPage(1);
          }}>
<option value={`all`}>{`All shifts`}</option>
<option value={`day`}>{`Day`}</option>
<option value={`night`}>{`Night`}</option>
</select>
</label>
<label>{`Machine`}<select value={machineId} onChange={e => {
            setMachineId(e.target.value), setPage(1);
          }}>
<option value={``}>{`All machines`}</option>{live.data?.machines?.map(e => <option value={e.id} key={e.id}>{e.name}</option>)}</select>
</label>
</div>
</section>
{reportError && <div className={`notice error`} role={`alert`}>{reportError}</div>}
{history.isError && <div className={`notice error`} role={`alert`}>{errorText(history.error)}<button className={`text-link`} type={`button`} onClick={() => history.refetch()}>{`Retry`}</button></div>}
{data &&
<section className={`u1-history-hero`} aria-label={`Production weight summary`}>
<h2>Estimated weights</h2>
<div className={`u1-history-metrics`}>{[[`Total production`, data.summary.productionKg], [`Coil used`, data.summary.coilUsedKg], [`Hole scrap`, data.summary.holeScrapKg], [`Cut blade scrap`, data.summary.cutBladeScrapKg], [`Other scrap`, data.summary.otherScrapKg]].map(([e, t], index) => <article key={e} className={index === 0 ? 'u1-history-primary-metric' : undefined}>
<span>{e}</span>
<strong className={t == null ? 'u1-history-missing' : undefined}>{t == null ? e === `Other scrap` ? `Not recorded` : `Unavailable` : weight(t)}</strong>
</article>)}</div>
<p className="u1-history-weight-note">Net production deducts hole scrap and recorded cut blade scrap from coil usage.</p>
</section>}
<div className={`u1-history-tabs`} role={`tablist`} aria-label={`History tables`}>
<button id={`u1-history-production-tab`} role={`tab`} aria-selected={activeView === `production`} aria-controls={`u1-history-production-panel`} type={`button`} onClick={() => setActiveView(`production`)}>Production</button>
<button id={`u1-history-jobs-tab`} role={`tab`} aria-selected={activeView === `jobs`} aria-controls={`u1-history-jobs-panel`} type={`button`} onClick={() => setActiveView(`jobs`)}>{`Job cards`}</button>{user?.role !== `labour` && <button id={`u1-history-holes-tab`} role={`tab`} aria-selected={activeView === `holes`} aria-controls={`u1-history-holes-panel`} type={`button`} onClick={() => setActiveView(`holes`)}>{`Inspections`}</button>}</div>{activeView === `holes` ? <section id={`u1-history-holes-panel`} role={`tabpanel`} aria-labelledby={`u1-history-holes-tab`}>
<HistoryHoleChecks date={selectedDate} shift={shift} machineId={machineId} onGenerate={() => openReport(`holes`)} generating={generating} key={`${selectedDate}:${shift}:${machineId}`} />
</section> : !data ? (history.isPending && <LoadingIndicator label="Loading production…" />) : activeView === `jobs` ? <section id={`u1-history-jobs-panel`} role={`tabpanel`} aria-labelledby={`u1-history-jobs-tab`} className="u1-history-results">
<div className={`table-toolbar`}>
<strong>{`Job cards`}</strong>
</div>
{data.jobCards.length > 0 && <div className="table-scroll u1-history-table" role="region" aria-label="Job cards table" tabIndex={0}>
<table>
<thead>
<tr>
<th>{`Job card`}</th>
<th className="u1-history-wide">{`Customer / project`}</th>
<th>{`Member`}</th>
<th>{`Machine`}</th>
<th>{`Production entries`}</th>
<th>{`Inspections`}</th>
<th className="u1-history-number">{`NOS`}</th>
<th>{`Coil used`}</th>
</tr>
</thead>
<tbody>{data.jobCards.map(e => <tr key={JSON.stringify([e.jobCardId, e.machineName, e.memberName, e.customerName, e.projectName])}>
<td>
<button className={`job-link-button`} type={`button`} onClick={() => viewJob(e.jobCardId)}>{`U1-JC-`}{e.jobCardId}</button>
</td>
<td>{e.customerName || '—'}{e.projectName && <small>{e.projectName}</small>}
</td>
<td>{e.memberName}</td>
<td>{e.machineName}</td>
<td>{number(e.entryCount)}</td>
<td>{number(e.inspectionCount || 0)}</td>
<td>
<strong>{number(e.pieces)}</strong>
</td>
<td>{weight(e.estimatedUsedKg)}</td>
</tr>)}</tbody>
</table>
</div>}{!data.jobCards.length && <p className="u1-history-empty">No job cards have production or inspections for these filters.</p>}</section> : <section id={`u1-history-production-panel`} role={`tabpanel`} aria-labelledby={`u1-history-production-tab`} className="u1-history-results">
<div className={`table-toolbar`}>
<div><strong>Production entries</strong><p className="u1-history-caption">{number(data.total)} entries</p></div>
<div className="u1-history-actions">
<button className={`primary-button`} type={`button`} disabled={generating || !data.total || history.isFetching} onClick={() => openReport(`production`)}>
<FileText size={16} />{generating ? `Creating…` : `Generate PDF`}</button>
</div>
</div>
{data.entries.length > 0 && <div className="table-scroll u1-history-table" role="region" aria-label="Production entries table" tabIndex={0}>
<table>
<thead>
<tr>
<th>{`Machine`}</th>
<th>{`Date / time`}</th>
<th className="u1-history-wide">{`Customer / project`}</th>
<th className="u1-history-wide">{`Material / section`}</th>
<th>{`Job card`}</th>
<th>{`Coil`}</th>
<th className="u1-history-number">{`NOS`}</th>
<th>{`Coil used`}</th>
<th>Hole scrap kg</th><th>Cut blade scrap (kg)</th>
<th>{`Entered by`}</th>{hasAccess(user,'unit1.production.edit')&&<th>Actions</th>}
</tr>
</thead>
<tbody>{data.entries.map(e => <tr key={e.id}>
<td>{e.machineName}</td>
<td>{formatDate(e.createdAt)}<small>{formatTime(e.createdAt)}{` · `}{e.shift || `—`}</small>
</td>
<td>{e.customerName || '—'}{e.projectName && <small>{e.projectName}</small>}
</td>
<td>
<strong>{[MATERIAL_LABELS[e.materialType] || e.materialType, e.memberName].filter(Boolean).join(' · ') || '—'}</strong>
<span className={`section-size`}>{e.sectionSize || `—`}</span>
</td>
<td>
<button className={`job-link-button`} type={`button`} onClick={() => viewJob(e.jobCardId)}>{`U1-JC-`}{e.jobCardId}</button>
</td>
<td>
<ProductionCoilLink entry={e} canView={hasAccess(user, `unit1.coils.view`)} onView={viewCoil} />
</td>
<td>
<strong>{number(e.pieces)}</strong>
</td>
<td>{weight(e.theoreticalUsedKg)}</td><td>{weight(e.holeScrapKg)}</td><td>{weight(e.cutBladeScrapKg)}</td>
<td>{e.enteredByName || (e.enteredBy == null ? '—' : `User #${e.enteredBy}`)}</td>{hasAccess(user,'unit1.production.edit')&&<td><button type="button" className="outline-button stock-icon-button" title="Edit production entry" aria-label="Edit production entry" onClick={()=>setEditing(e)}><Pencil size={18}/></button></td>}
</tr>)}</tbody>
</table>
</div>}{!data.entries.length && <p className="u1-history-empty">No entries match these filters.</p>}{totalPages > 1 && <nav className="u1-history-pagination" aria-label="Production history pages">
<button className={`outline-button`} type={`button`} disabled={page <= 1} onClick={() => setPage(page - 1)}>{`Previous`}</button>
<span>{`Page `}{page}{` of `}{totalPages}</span>
<button className={`outline-button`} type={`button`} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{`Next`}</button>
</nav>}</section>}</> : <section className="u1-history-archive">
<form className="u1-history-controls" onSubmit={event => { event.preventDefault(); if (date) selectDate(date); }}>
<div className="u1-history-title"><CalendarDays size={22} aria-hidden="true" /><h2>Select production date</h2></div>
<div className="u1-history-date-form">
<label htmlFor="u1-history-date">Production date<input id="u1-history-date" type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
<button className="primary-button" type="submit" disabled={!date}><Search size={17} />View history</button>
</div>
</form>
<div className="u1-history-controls">
<div className={`u1-history-recorded-heading`}>
<h2>Recorded dates</h2>
<label>{`Filter by month`}<input type={`month`} value={month} onChange={e => setMonth(e.target.value)} />
</label>
</div>{dates.isPending && <LoadingIndicator label={`Loading dates…`} />}{dates.isError && <p className={`notice error`}>{errorText(dates.error)}</p>}{!dates.isPending && !dates.isError && !visibleDates.length && <p>{`No production recorded in this month.`}</p>}<div className={`u1-history-date-list`}>{visibleDates.map(e => <button type={`button`} onClick={() => selectDate(e.shiftDate)} key={e.shiftDate}>
<strong>{formatDate(e.shiftDate)}</strong>
<ChevronRight size={18} aria-hidden="true" />
</button>)}</div>
</div>
</section>}{coil && <div className={`modal-backdrop`} onMouseDown={e => {
      e.target === e.currentTarget && setCoil(null);
    }}>
<div className={`inward-modal`} role={`dialog`} aria-modal={`true`} aria-label={`Coil details`}>
<div className={`modal-header`}>
<div>
<span className={`eyebrow`}>{`COIL STOCK`}</span>
<h2>{coil.internalId}</h2>
</div>
<button className={`icon-button modal-close`} type={`button`} aria-label={`Close coil details`} onClick={() => setCoil(null)}>
<span aria-hidden={`true`}>{`×`}</span>
</button>
</div>
<div className={`modal-body`}>
<div className={`job-detail-grid`}>
<span>{`Material `}<strong>{MATERIAL_LABELS[coil.materialType] || coil.materialType}</strong>
</span>
<span>{`Size `}<strong>{coil.widthMm}{` × `}{coil.thicknessMm}{` mm`}</strong>
</span>
<span>{`Grade `}<strong>{coil.grade}</strong>
</span>
<span>{`Invoice `}<strong>{coil.invoice}</strong>
</span>
<span>{`Rate `}<strong>{formatCoilRate(coil.ratePerKg)}</strong>
</span>
<span>{`Vendor `}<strong>{coil.vendorCode || `—`}</strong>
</span>
<span>{`TC number `}<strong>{coil.tcNumber || `—`}</strong>
</span>
<span>{`Coil qty `}<strong>{coil.coilQty}</strong>
</span>
<span>{`Total weight `}<strong>{coil.totalWeightKg}{` kg`}</strong>
</span>
</div>
</div>
</div>
</div>}{editing&&<ProductionEntryEditor entry={editing} onClose={()=>setEditing(null)}/>}<JobCardDetails job={job} onClose={() => setJob(null)} />
</section>;
}
export { ProductionHistoryScreen as default };
