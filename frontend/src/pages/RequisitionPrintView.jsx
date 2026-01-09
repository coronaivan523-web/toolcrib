
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { requisitionService } from '../services/requisitions'
import { supabase } from '../lib/supabase'

export default function RequisitionPrintView() {
    const { id } = useParams()
    const [req, setReq] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await requisitionService.getRequisitionById(id)
            if (data) {
                // Enrich items with material data (images, names)
                const itemsWithMaterials = await Promise.all(data.items.map(async (item) => {
                    const { data: mat } = await supabase
                        .from('materials')
                        .select('*')
                        .eq('id', item.material_id)
                        .single()

                    let imageUrl = null
                    if (mat?.image_url) {
                        imageUrl = mat.image_url.startsWith('http')
                            ? mat.image_url
                            : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${mat.image_url}`
                    }

                    return {
                        ...item,
                        material_name: mat?.name || 'Unknown',
                        part_number: mat?.part_number || '',
                        english_name: mat?.description || mat?.name, // Assuming description or name used as english/alt
                        image_url: imageUrl
                    }
                }))
                setReq({ ...data, items: itemsWithMaterials })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const getCauseLabel = (code) => code || ''

    // Helper to normalize strings for comparison (remove spaces, lowercase)
    const trainCase = (str) => str ? str.toLowerCase().replace(/\s+/g, '').trim() : ''

    // Helper for safe date rendering
    const safeDate = (dateVal) => {
        if (!dateVal) return ''
        try {
            const d = new Date(dateVal)
            return isNaN(d.getTime()) ? '' : d.toLocaleDateString()
        } catch (e) {
            return ''
        }
    }

    if (loading) return <div className="p-10 text-center">Loading print view...</div>
    if (!req) return <div className="p-10 text-center text-red-500">Requisition not found</div>

    // Helpers for signature mapping
    const getApprover = (rolePattern, teamPattern) => {
        if (!req.approvals) return null
        return req.approvals.find(a =>
            (a.role_at_time?.toLowerCase().includes(rolePattern) || a.approver?.email.includes(rolePattern)) &&
            (teamPattern ? (a.approver?.email.includes(teamPattern) || a.role_at_time?.includes(teamPattern)) : true)
        )
    }

    // Map specific signatures based on the image form
    // Gerente MX, Gerente CH, etc.
    // ONLY show if status is APPROVED
    const mxManager = req.approvals?.find(a =>
        (a.step_name?.includes('Gerente Mexicano')) &&
        a.step_status === 'APPROVED'
    )
    const chManager = req.approvals?.find(a =>
        (a.step_name?.includes('Gerente Chino')) &&
        a.step_status === 'APPROVED'
    )

    let requesterSignatureUrl = null
    let requesterSignatureDate = null // Removed default req.created_at

    // Check approvals for "SOLICITANTE" step
    const solicitanteStep = req.approvals?.find(a => a.step_name === 'SOLICITANTE' && a.step_status === 'APPROVED')

    if (solicitanteStep) {
        // Check for signature in approved step
        requesterSignatureUrl = solicitanteStep.approver?.signature_url
        requesterSignatureDate = solicitanteStep.action_at
    } else {
        // Fallback for legacy: if creator signed it and it's already approved overall?
        // No, let's keep it strict: if the SOLICITANTE step isn't approved, no signature.
        // Exception: If the requisition is OLD and doesn't have a SOLICITANTE step but is approved?
        // Let's stick to the new logic for now.
    }

    if (loading || !req) return <div>Loading...</div>

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: letter;
                    }
                    body {
                        margin: 0;
                        padding-top: 1.91cm;
                        padding-bottom: 1.91cm;
                        padding-left: 0.64cm;
                        padding-right: 0.64cm;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
            <div className="bg-white text-black text-xs font-sans max-w-[21.59cm] mx-auto print:max-w-none">
                {/* --- PAGE 1: FORM --- */}
                <div className="print:h-[27cm] flex flex-col page-break-after-always">

                    {/* Header */}
                    <div className="flex mb-1">
                        <div className="w-1/4 flex items-center justify-center p-2 border border-black">
                            <img src="/wasion_logo.png" alt="Wasion" className="h-8" />
                        </div>
                        <div className="w-1/2 flex items-center justify-center text-center font-bold text-sm border-y border-r border-black px-2">
                            REQUERIMIENTO DE MATERIALES Y /O HERRAMIENTAS
                        </div>
                        <div className="w-1/4 text-[9px] flex flex-col justify-center items-center text-center px-2 py-1">
                            <div><span>CODIGO.CO-R-01</span></div>
                            <div><span>VERSION.04</span></div>
                            <div><span>FECHA.24/04/23</span></div>
                        </div>
                    </div>

                    {/* Info Block */}
                    <div className="text-[10px] mb-1">
                        <div className="flex">
                            <div className="w-1/2 flex p-1 items-center">
                                <span className="w-20 font-bold">Solicitante:</span>
                                <div className="flex-1 pl-1 truncate h-4">{req.requester_name || req.requester?.full_name}</div>
                            </div>
                            <div className="w-1/2 flex p-1 items-center">
                                <span className="w-28 font-bold">Fecha Elaboración:</span>
                                <div className="flex-1 pl-1 truncate h-4">{safeDate(req.created_at)}</div>
                            </div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2 flex p-1 items-center">
                                <span className="w-20 font-bold">Puesto:</span>
                                <div className="flex-1 pl-1 truncate h-4">{req.requester?.job_title || req.job_title || ''}</div>
                            </div>
                            <div className="w-1/2 flex p-1 items-center relative">
                                <span className="w-28 font-bold">Departamento:</span>
                                <div className="flex-1 pl-1 truncate h-4">{req.requester?.department || req.department || ''}</div>
                                <div className="absolute right-1 top-1 text-red-600 font-bold text-[8px]">*SOLO COMPRA RECURRENTE</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Table */}
                    <table className="w-full border-collapse border border-black text-center mb-1 table-fixed text-[9px]">
                        <thead className="bg-black text-white font-bold uppercase">
                            <tr className="h-[18px]">
                                <th className="border border-black py-0 leading-none w-[40%]">DESCRIPCION</th>
                                <th className="border border-black py-0 leading-none w-[8%]">CANT</th>
                                <th className="border border-black py-0 leading-none w-[8%]">PROV</th>
                                <th className="border border-black py-0 leading-none w-[8%]">CAUSA</th>
                                <th className="border border-black py-0 leading-none w-[12%]">C.COSTOS</th>
                                <th className="border border-black py-0 leading-none w-[10%]">PROYECTO</th>
                                <th className="border border-black py-0 leading-none w-[14%]">CONSUMO MENSUAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 13 }).map((_, i) => {
                                const item = req.items[i]
                                return (
                                    <tr key={i} className="h-[18px]">
                                        <td className="border border-black px-1 text-left truncate align-middle overflow-hidden whitespace-nowrap">
                                            {item?.notes || item?.material_name || ''}
                                        </td>
                                        <td className="border border-black align-middle">{item?.quantity_requested || item?.quantity || ''}</td>
                                        <td className="border border-black align-middle uppercase">{item?.unit ? item.unit.substring(0, 4) : ''}</td>
                                        <td className="border border-black align-middle">{getCauseLabel(item?.cause || req.cause)}</td>
                                        <td className="border border-black align-middle">{item?.cost_center || ''}</td>
                                        <td className="border border-black align-middle">{item?.project_code || ''}</td>
                                        <td className="border border-black align-middle"></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    <div className="p-1 mb-2 h-12 text-[10px] flex items-start">
                        <span className="font-bold mr-2 whitespace-nowrap">Justificación de la compra:</span>
                        <span className="italic text-slate-800 break-words leading-tight">{req.comments || req.justification || req.purchase_justification || ''}</span>
                    </div>

                    <div className="text-red-600 text-[9px] font-bold leading-tight">
                        CAUSA: <span className="underline">OP</span> (Operación normal), <span className="underline">LS</span> (Paro de linea), <span className="underline">HS</span> (Seguridad), <span className="underline">CB</span> (Requerimiento del cliente)
                    </div>

                    <div className="h-[18px]"></div>

                    <div className="flex flex-col gap-2">
                        <div className="text-[9px] w-full">
                            {/* Solicitante (Multi-Sig Row) */}
                            <div className="flex justify-between items-end mb-2">
                                <div className="w-[50%] flex items-end">
                                    <span className="font-bold mr-1 w-20">Solicitante:</span>
                                    <div className="border-b border-black flex-1 relative h-4">
                                        {(() => {
                                            const primarySteps = req.approvals?.filter(a =>
                                                a.step_status === 'APPROVED' &&
                                                (a.step_name === 'SOLICITANTE' || a.step_name?.includes('Team')) &&
                                                !a.step_name?.includes('Gerente')
                                            ).sort((a, b) => a.step_order - b.step_order) || []

                                            // Deduplicate CONSECUTIVE signatures by same user
                                            // This merges Step 1 (Solicitante) with Step 2 (First Team Approval) if they are the same person,
                                            // but keeps later approvals by the same person if separated by others.
                                            const uniqueSignatures = [];
                                            primarySteps.forEach((step, idx) => {
                                                if (idx === 0) {
                                                    uniqueSignatures.push(step);
                                                } else {
                                                    const prev = primarySteps[idx - 1];
                                                    const currId = step.approver?.id || step.assigned_to_user_id;
                                                    const prevId = prev.approver?.id || prev.assigned_to_user_id;

                                                    if (currId !== prevId) {
                                                        uniqueSignatures.push(step);
                                                    }
                                                }
                                            });

                                            // If no approved primary steps, fallback to legacy check or empty
                                            if (uniqueSignatures.length === 0) {
                                                // Legacy fallback or just name
                                                return (
                                                    <span className="absolute bottom-0 left-2 text-[8px] italic font-serif text-slate-600 z-10 truncate w-full">
                                                        {req.requester_name || req.requester?.full_name}
                                                    </span>
                                                )
                                            }

                                            return (
                                                <div className="absolute inset-0 flex items-end justify-start pl-2 gap-2 z-10 pointer-events-none">
                                                    {uniqueSignatures.map((step, idx) => (
                                                        step.approver?.signature_url && (
                                                            <img
                                                                key={idx}
                                                                src={step.approver.signature_url}
                                                                alt={`Sig ${idx}`}
                                                                className="h-8 w-auto object-contain opacity-90 max-w-[60px]"
                                                                style={{ mixBlendMode: 'multiply' }}
                                                            />
                                                        )
                                                    ))}
                                                </div>
                                            )
                                        })()}
                                        <span className="relative z-0 truncate w-full block pl-1"></span>
                                    </div>
                                </div>
                                <div className="w-[45%] flex items-end pr-[20%]">
                                    <span className="font-bold mr-1 w-20 text-right">Fecha y Hora:</span>
                                    {/* Use date from first primary approval or created_at */}
                                    <span className="border-b border-black flex-1 text-center">
                                        {(() => {
                                            const firstStep = req.approvals?.filter(a =>
                                                a.step_status === 'APPROVED' &&
                                                (a.step_name === 'SOLICITANTE' || a.step_name?.includes('Team')) &&
                                                !a.step_name?.includes('Gerente')
                                            ).sort((a, b) => a.step_order - b.step_order)[0]

                                            return safeDate(firstStep?.action_at || req.created_at)
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {/* Gerente MX */}
                            <div className="flex justify-between items-end mb-2">
                                <div className="w-[50%] flex items-end">
                                    <span className="font-bold mr-1 w-20">Gerente MX:</span>
                                    <div className="border-b border-black flex-1 relative h-4">
                                        {mxManager?.approver?.signature_url && (
                                            <img src={mxManager.approver.signature_url} className="absolute bottom-0 left-4 h-8 w-auto object-contain z-10 opacity-90" style={{ mixBlendMode: 'multiply' }} />
                                        )}
                                        <span className="relative z-0 truncate w-full block pl-1 text-green-700"></span>
                                    </div>
                                </div>
                                <div className="w-[45%] flex items-end pr-[20%]">
                                    <span className="font-bold mr-1 w-20 text-right">Fecha y Hora:</span>
                                    <span className="border-b border-black flex-1 text-center">{safeDate(mxManager?.action_at)}</span>
                                </div>
                            </div>

                            {/* Gerente CH */}
                            <div className="flex justify-between items-end mb-2">
                                <div className="w-[50%] flex items-end">
                                    <span className="font-bold mr-1 w-20">Gerente CH:</span>
                                    <div className="border-b border-black flex-1 relative h-4">
                                        {chManager?.approver?.signature_url && (
                                            <img src={chManager.approver.signature_url} className="absolute bottom-0 left-4 h-8 w-auto object-contain z-10 opacity-90" style={{ mixBlendMode: 'multiply' }} />
                                        )}
                                        <span className="relative z-0 truncate w-full block pl-1 text-blue-700"></span>
                                    </div>
                                </div>
                                <div className="w-[45%] flex items-end pr-[20%]">
                                    <span className="font-bold mr-1 w-20 text-right">Fecha y Hora:</span>
                                    <span className="border-b border-black flex-1 text-center">{safeDate(chManager?.action_at)}</span>
                                </div>
                            </div>

                            {/* Compras */}
                            <div className="flex justify-between items-end mb-2">
                                <div className="w-[50%] flex items-end">
                                    <span className="font-bold mr-1 w-28">*(C2 y C3) Gte.Compras:</span>
                                    <span className="border-b border-black flex-1"></span>
                                </div>
                                <div className="w-[45%] flex items-end pr-[20%]">
                                    <span className="font-bold mr-1 w-20 text-right">Fecha y Hora:</span>
                                    <span className="border-b border-black flex-1"></span>
                                </div>
                            </div>

                            {/* Gerente General */}
                            <div className="flex justify-between items-end">
                                <div className="w-[50%] flex items-end">
                                    <span className="font-bold mr-1 w-28">*(C3) Gerente General:</span>
                                    <span className="border-b border-black flex-1"></span>
                                </div>
                                <div className="w-[45%] flex items-end pr-[20%]">
                                    <span className="font-bold mr-1 w-20 text-right">Fecha y Hora:</span>
                                    <span className="border-b border-black flex-1"></span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: Folio & Criticality */}
                        <div className="flex justify-between items-start mt-8">
                            {/* Grey Box (Left) */}
                            {/* Grey Box Container (Left) */}
                            <div className="w-[45%] flex bg-gray-300 ring-1 ring-black/50">
                                {/* Vertical Label Inside */}
                                <div className="w-5 flex items-center justify-center relative">
                                    <div className="-rotate-90 text-[8px] font-bold text-gray-800 whitespace-nowrap absolute">*Exclusivo Compras</div>
                                </div>
                                {/* Grey Box Content */}
                                <div className="flex-1 p-2 text-[9px]">
                                    <div className="flex mb-3 items-end"><span className="w-16 font-bold">Folio:</span> <span className="border-b border-black flex-1 h-4"></span></div>
                                    <div className="flex mb-3 items-end"><span className="w-16 font-bold">Recibido por:</span> <span className="border-b border-black flex-1"></span></div>
                                    <div className="flex items-end"><span className="w-16 font-bold">Fecha y hora:</span> <span className="border-b border-black flex-1"></span></div>
                                </div>
                            </div>

                            {/* Criticality Table (Right) */}
                            <div className="w-[45%]">
                                <table className="w-full text-center border-collapse border border-black text-[8px]">
                                    <thead className="bg-[#B4C6E7] font-bold">
                                        <tr>
                                            <th className="border border-black py-0.5 w-[40%]">CRITICIDAD</th>
                                            <th className="border border-black py-0.5 w-[20%]">SOLICITADO</th>
                                            <th className="border border-black py-0.5 w-[20%]">ASIGNADO</th>
                                            <th className="border border-black py-0.5 w-[20%]">CAUSA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { id: 'C1', label: 'Normal' },
                                            { id: 'C2', label: 'Urgent' },
                                            { id: 'C3', label: 'Crítico' },
                                            { id: 'C4', label: 'Proyecto Esp.' },
                                        ].map(r => {
                                            const val = (req.criticality || req.criticality_requested || req.priority || '').toUpperCase()
                                            const match = val.includes(r.id) || val.includes(r.label.toUpperCase()) || (r.id === 'C1' && val === 'NORMAL') || (r.id === 'C2' && val === 'HIGH') || (r.id === 'C3' && val === 'URGENT')
                                            return (
                                                <tr key={r.id}>
                                                    <td className="border border-black text-left px-1 py-0.5">({r.id}) {r.label}</td>
                                                    <td className="border border-black text-sm leading-none align-middle bg-white">{match ? 'X' : ''}</td>
                                                    <td className="border border-black bg-white"></td>
                                                    <td className="border border-black"></td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="mt-2 text-[7px] leading-tight space-y-0.5 text-justify">
                        <p><strong>1.-</strong> El solicitante deberá estar registrado en el documento CO-R-13 Listado de requisitores autorizados</p>
                        <p><strong>2.-</strong> Las firmas deben recolectarse por el solicitante previo a la entrega a compras (excepto C3), especificando fecha y hora.</p>
                        <p><strong>3.-</strong> El solicitante es responsable del llenado completo y correcto de este documento, así como de proporcionar toda la información técnica requerida para el procesamiento adecuado de la compra (marca, modelo, especificaciones, etc.) Cualquier requerimiento con informacion y/o firmas incompletas será rechazado.</p>
                        <p><strong>4.-</strong> El departamento de compras podrá requerir al solicitante la información y/o validación necesaria para el procesamiento adecuado de la compra. El solicitante deberá proporcionar la información/validación requerida dentro de un plazo no mayor a 3 días hábiles, de no recibir la respuesta del solicitante en el plazo indicado, el requerimiento será cancelado.</p>
                        <p><strong>5.-</strong> El departamento de compras evaluará la criticidad solicitada y asignará la criticidad aceptada, en caso de ser diferente a la solicitada. El comprador deberá justificar la reasignación y comunicar de manera inmediata al solicitante la criticidad asignada, así como la (s) causa (s) de la reasignación.</p>
                        <p className="text-red-600 font-bold">*CAUSA: FC (Proyecto de instalaciones/facilities), CM (Producto o servicio no de linea o hecho a medida), MQ (Maquinaria especializada), SA (Aprobación especial requerida para procesar el requerimiento)</p>
                        <p><strong>6.-</strong> Tiempo de respuesta en días hábiles para el procesamiento de la orden de compra: C1 (7), C2 (4), C3 (2), C4 (TBD). El tiempo de respuesta inicia a partir de la entrega a compras y asignación del folio de seguimiento.</p>
                        <p><strong>7.-</strong> La ejecución de la compra estará sujeta a la aprobación final de la orden de compra</p>
                        <p><strong>8.-</strong> La recepción de los materiales/ servicio estará sujeta a la existencia y tiempo de entrega del proveedor.</p>
                    </div>
                </div>

                {/* --- PAGE 2: IMAGES --- */}
                {req.items?.length > 0 && (
                    <div className="print:h-[27cm] flex flex-col page-break-before-always pt-4">
                        <div className="grid grid-cols-2 gap-4 h-full">
                            {Array.from({ length: 6 }).map((_, idx) => {
                                const item = req.items[idx]
                                return (
                                    <div key={idx} className="border border-black flex flex-col h-[7.2cm] mb-4 break-inside-avoid">
                                        <div className="flex-1 flex items-center justify-center p-2 overflow-hidden bg-white relative">
                                            {item?.image_url ? (
                                                <img src={item.image_url} alt={item.material_name} className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <span className="text-gray-200"></span>
                                            )}
                                        </div>
                                        <div className="border-t border-black h-8 flex items-center justify-center text-center px-2 text-sm bg-white">
                                            {item ? (item.english_name || item.material_name || "0") : "0"}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
