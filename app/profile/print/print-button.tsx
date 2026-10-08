'use client';
export default function PrintButton(){return <button className="primary print-actions" style={{marginBottom:30}} onClick={()=>window.print()}>Сохранить как PDF / печать</button>;}
