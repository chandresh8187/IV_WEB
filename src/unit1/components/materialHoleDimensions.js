// WEB/crown is the top inspection face; flanges, lips and feet belong to
// the side view. W-beam panels use their actual cross-section orientation.
export function holeFaceInView(face,view='iso') {
  if(view==='end')return false;
  if(view!=='top'&&view!=='side')return true;
  const topFace=face.key.startsWith('w_panel_')
    ? Math.abs(face.end[0]-face.start[0])>=Math.abs(face.end[1]-face.start[1])
    : face.key==='web';
  return view==='top'?topFace:!topFace;
}

export function holeDimensionText(face,hole) {
  return {
    size:`${face.label.toUpperCase()} · ${hole.letter}${hole.index} · ${hole.label} mm`,
    position:`${hole.position} mm from end 0`,
  };
}

export function holeSpacingText(face,{from,to,distance}) {
  return `${face.label.toUpperCase()} · ${from.letter}${from.index} → ${to.letter}${to.index} · ${distance} mm C/C`;
}
