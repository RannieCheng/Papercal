import { useState, useRef, useEffect } from 'react';
import './index.css';

// --- 组件：单日网格 (携带专属画布引擎) ---
function DayCell({ date, isCurrentMonth, isToday, tool, color, monthKey, width, height }) {
  const canvasRef = useRef(null);
  const cellRef = useRef(null);
  const [texts, setTexts] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typePos, setTypePos] = useState({ x: 0, y: 0 });

  const storageKey = `papercal_${monthKey}_day_${date}`;

  // 【核心修复】：挂载/宽高变化/月份变化时，彻底擦黑板，然后重新加载！
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cellRef.current || !isCurrentMonth) return;
    
    const rect = cellRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    // 每次渲染前，先彻底把旧内容擦掉（解决翻页重影问题）
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const savedImg = localStorage.getItem(`${storageKey}_img`);
    if (savedImg) {
      const img = new Image();
      img.src = savedImg;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }

    const savedTexts = localStorage.getItem(`${storageKey}_txt`);
    setTexts(savedTexts ? JSON.parse(savedTexts) : []);
  }, [width, height, monthKey, date, isCurrentMonth]);

  // 保存颜色热力点到 Meta
  const saveColorMeta = (usedColor) => {
    if (tool === 'eraser') return;
    const metaStr = localStorage.getItem(`${storageKey}_meta`) || '[]';
    const meta = JSON.parse(metaStr);
    if (!meta.includes(usedColor)) {
      meta.push(usedColor);
      localStorage.setItem(`${storageKey}_meta`, JSON.stringify(meta));
    }
  };

  const saveState = () => {
    localStorage.setItem(`${storageKey}_img`, canvasRef.current.toDataURL());
    localStorage.setItem(`${storageKey}_txt`, JSON.stringify(texts));
  };

  // 一键清空单日
  const handleClearDay = () => {
    if (window.confirm(`确定要清空 ${date}日的记录吗？`)) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setTexts([]);
      localStorage.removeItem(`${storageKey}_img`);
      localStorage.removeItem(`${storageKey}_txt`);
      localStorage.removeItem(`${storageKey}_meta`);
    }
  };

  const startAction = (e) => {
    if (e.pointerType === 'touch' || !isCurrentMonth) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;

    if (tool === 'text') { setIsTyping(true); setTypePos({ x, y }); return; }
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(x, y);
    canvasRef.current.setPointerCapture(e.pointerId);
  };

  const draw = (e) => {
    if (!isDrawing) return; e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    const pressure = e.pressure || 0.5;
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : 1.5 + pressure * 3;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
  };

  const endAction = (e) => {
    if (isDrawing) {
      setIsDrawing(false); canvasRef.current.releasePointerCapture(e.pointerId);
      saveState(); saveColorMeta(color);
    }
  };

  const finishTyping = (e) => {
    const val = e.target.value.trim();
    if (val) {
      setTexts(prev => [...prev, { id: Date.now(), text: val, x: typePos.x, y: typePos.y, color }]);
      setTimeout(() => { saveState(); saveColorMeta(color); }, 50);
    }
    setIsTyping(false);
  };

  return (
    <div ref={cellRef} className={`day-cell ${!isCurrentMonth ? 'empty' : ''} ${isToday ? 'today' : ''}`} onDoubleClick={(e) => { if(isCurrentMonth) setTool('text'); }}>
      {isCurrentMonth && (
        <>
          <button className="clear-day-btn" onClick={handleClearDay} title="清空本日">🗑️ 清空</button>
          <span className={`date-num ${isToday ? 'today' : ''}`}>{date}</span>
          <canvas ref={canvasRef} className="cell-canvas" onPointerDown={startAction} onPointerMove={draw} onPointerUp={endAction} onPointerCancel={endAction} />
          <div className="text-layer">
            {texts.map(t => <div key={t.id} className="typed-text" style={{ left: t.x, top: t.y - 8, color: t.color }}>{t.text}</div>)}
            {isTyping && <input autoFocus className="text-input-box" style={{ left: typePos.x, top: typePos.y - 8, color }} onBlur={finishTyping} onKeyDown={e => e.key === 'Enter' && finishTyping(e)} />}
          </div>
        </>
      )}
    </div>
  );
}

// --- 组件：年历视图 (带有联动热力点) ---
function YearView({ year, onMonthSelect }) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  const realToday = new Date();

  return (
    <div className="year-view-container">
      <div className="year-grid">
        {months.map(month => {
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
          
          return (
            <div key={month} className="mini-month" onClick={() => onMonthSelect(month)}>
              <div className="mini-month-title">{month + 1}月</div>
              <div className="mini-days-header">
                {['日','一','二','三','四','五','六'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="mini-days-grid">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum = i - firstDay + 1;
                  const isCurrent = dayNum > 0 && dayNum <= daysInMonth;
                  const isToday = isCurrent && realToday.getFullYear()===year && realToday.getMonth()===month && realToday.getDate()===dayNum;
                  
                  // 读取颜色热力点
                  let dots = [];
                  if (isCurrent) {
                    const meta = localStorage.getItem(`papercal_${year}_${month}_day_${dayNum}_meta`);
                    if (meta) dots = JSON.parse(meta).slice(0, 3); // 最多显示3个不同颜色的圆点
                  }

                  return (
                    <div key={i} className={`mini-day ${!isCurrent ? 'empty' : ''} ${isToday ? 'today' : ''}`}>
                      {isCurrent && dayNum}
                      {dots.length > 0 && (
                        <div className="mini-dots-container">
                          {dots.map((dotColor, idx) => (
                            <div key={idx} className="mini-dot" style={{ backgroundColor: dotColor }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 根节点 ---
export default function App() {
  const [view, setView] = useState('year'); // 'year' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2));
  const [tool, setTool] = useState('pen'); 
  const [color, setColor] = useState('#1A1A1A');
  const [rowHeights, setRowHeights] = useState(Array(6).fill(120));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}_${month}`;

  // 【核心修复】：进入不同月份时，读取专属的网格高度！
  useEffect(() => {
    if (view === 'month') {
      const savedRows = localStorage.getItem(`papercal_rows_${monthKey}`);
      if (savedRows) setRowHeights(JSON.parse(savedRows));
      else setRowHeights(Array(6).fill(120)); // 默认高度
    }
  }, [monthKey, view]);

  const handleDrag = (rowIndex, e) => {
    const startY = e.clientY; const startHeight = rowHeights[rowIndex];
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      setRowHeights(prev => {
        const next = [...prev];
        next[rowIndex] = Math.max(80, startHeight + delta);
        return next;
      });
    };
    const onUp = () => { 
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp);
      // 拖拽结束，保存当前月份的高度
      setRowHeights(current => {
        localStorage.setItem(`papercal_rows_${monthKey}`, JSON.stringify(current));
        return current;
      });
    };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  };

  // 生成月历数据
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridData = Array.from({ length: 42 }).map((_, i) => {
    const dayNum = i - firstDay + 1;
    return { id: i, dayNum, isCurrentMonth: (dayNum > 0 && dayNum <= daysInMonth), isToday: (dayNum > 0 && dayNum <= daysInMonth && new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === dayNum) };
  });

  const colors = ['#1A1A1A', '#E8684A', '#5B8FF9', '#B8A398', '#9BA5A3'];

  return (
    <div className="app-container">
      {/* 动态顶部导航 */}
      <header className="header-toolbar">
        <div className="nav-group">
          {view === 'month' && (
            <button className="nav-btn" onClick={() => setView('year')} style={{ border: '1px solid #ddd', marginRight: '16px'}}>
              ← 返回年历
            </button>
          )}
          <div className="nav-btn" onClick={() => setCurrentDate(new Date(year - (view==='year'?1:0), month - (view==='month'?1:0), 1))}>&lt;</div>
          <div style={{ width: '130px', textAlign: 'center' }}>
            {view === 'year' ? `${year}年` : `${year}年 ${month + 1}月`}
          </div>
          <div className="nav-btn" onClick={() => setCurrentDate(new Date(year + (view==='year'?1:0), month + (view==='month'?1:0), 1))}>&gt;</div>
        </div>

        {view === 'month' && (
          <>
            <div className="tool-group">
              {colors.map(c => <div key={c} className={`color-btn ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />)}
              <div className={`color-picker-wrap ${!colors.includes(color) ? 'active' : ''}`}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="自定义颜色" />
              </div>
            </div>
            <div className="tool-group">
              <button className={`action-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>画笔</button>
              <button className={`action-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')}>打字</button>
              <button className={`action-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>橡皮</button>
            </div>
          </>
        )}
      </header>

      {/* 视图分发 */}
      {view === 'year' ? (
        <YearView year={year} onMonthSelect={(m) => { setCurrentDate(new Date(year, m, 1)); setView('month'); }} />
      ) : (
        <>
          <div className="weekdays">{['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(d => <div key={d}>{d}</div>)}</div>
          <div className="calendar-body">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="calendar-row" style={{ height: rowHeights[rowIndex] }}>
                {gridData.slice(rowIndex * 7, rowIndex * 7 + 7).map(cell => (
                  <DayCell key={cell.id} date={cell.dayNum} isCurrentMonth={cell.isCurrentMonth} isToday={cell.isToday} tool={tool} color={color} monthKey={monthKey} width={rowHeights[rowIndex]} height={rowHeights[rowIndex]} />
                ))}
                {rowIndex < 5 && <div className="row-resizer" onPointerDown={(e) => handleDrag(rowIndex, e)} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}