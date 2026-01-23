import { forEach } from "jszip";
import { isMatrix } from "mathjs";
import { re } from "mathjs";
import { create, all } from "mathjs";

const math = create(all);


export class Mass {
  constructor({ x = 0, y = 0, width = 100, height = 100, fill = 'grey' } = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fill = fill;
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  render(ctx, rc, { shadow = false, shadowOffset = 10 } = {}) {
    if (shadow) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.filter = 'blur(2.5px)';
      ctx.fillRect(this.x + shadowOffset, this.y + shadowOffset, this.width, this.height);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    if (rc) {
      rc.rectangle(this.x, this.y, this.width, this.height, { fill: this.fill, seed: 1 });
    }
    ctx.restore();
  }

  getAnchorPoint(name = 'center') {
    switch (name) {
      case 'top':
        return { x: this.x + this.width / 2, y: this.y };
      case 'bottom':
        return { x: this.x + this.width / 2, y: this.y + this.height };
      case 'left':
        return { x: this.x, y: this.y + this.height / 2 };
      case 'right':
        return { x: this.x + this.width, y: this.y + this.height / 2 };
      case 'center':
      default:
        return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }
  }

  anchorToPoint(name, point, mode = 'move') {
    const anchor = this.getAnchorPoint(name);
    if (mode === 'move') {
      this.x += point.x - anchor.x;
      this.y += point.y - anchor.y;
      return;
    }

    if (name === 'top') {
      const bottom = this.getAnchorPoint('bottom');
      this.y = point.y;
      this.height = Math.max(1, bottom.y - point.y);
    } else if (name === 'bottom') {
      this.height = Math.max(1, point.y - this.y);
    } else if (name === 'left') {
      const right = this.getAnchorPoint('right');
      this.x = point.x;
      this.width = Math.max(1, right.x - point.x);
    } else if (name === 'right') {
      this.width = Math.max(1, point.x - this.x);
    }
  }
}

export class Spring {
  constructor({
    start = { x: 0, y: 0 },
    end = { x: 0, y: 100 },
    coils = 8,
    amplitude = 10,
    lineWidth = 3,
  } = {}) {
    this.start = { ...start };
    this.end = { ...end };
    this.coils = coils;
    this.amplitude = amplitude;
    this.lineWidth = lineWidth;
  }

  move(dx, dy) {
    this.start.x += dx;
    this.start.y += dy;
    this.end.x += dx;
    this.end.y += dy;
  }

  render(ctx, rc, { shadow = false, shadowOffset = 10 } = {}, topPoint = this.start, bottomPoint = this.end) {
    this.start = { ...topPoint };
    this.end = { ...bottomPoint };
    const points = [this.start];
    for (let i = 0; i < this.coils; i++) {
      const t = (i + 0.5) / this.coils;
      points.push({
        x: this.start.x + (i % 2 === 0 ? -this.amplitude : this.amplitude),
        y: this.start.y + t * (this.end.y - this.start.y),
      });
    }
    points.push(this.end);

    if (shadow) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.filter = 'none';
      ctx.lineWidth = this.lineWidth + 1;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      const first = points[0];
      ctx.moveTo(first.x + shadowOffset, first.y + shadowOffset);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        ctx.lineTo(p.x + shadowOffset, p.y + shadowOffset);
      }
      ctx.stroke();
      ctx.restore();
    }

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      if (shadow) {
        continue;
      }
      if (rc) {
        ctx.save();
        ctx.filter = 'none';
        rc.line(from.x, from.y, to.x, to.y, { seed: 10 + i, strokeWidth: 0.5 });
        ctx.restore();
      } else {
        ctx.save();
        ctx.filter = 'blur(0px)';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  getAnchorPoint(name = 'start') {
    if (name === 'end' || name === 'bottom') return { ...this.end };
    if (name === 'center') {
      return {
        x: (this.start.x + this.end.x) / 2,
        y: (this.start.y + this.end.y) / 2,
      };
    }
    if (name === 'top') return { ...this.start };
    return { ...this.start };
  }

}

export class Damper {
  constructor({
    start = { x: 0, y: 0 },
    end = { x: 0, y: 120 },
    bodyWidth = 20,
    bodyHeight = 20,
    lineWidth = 2,
    linelength = 10,
  } = {}) {
    this.start = { ...start };
    this.end = { ...end };
    this.bodyWidth = bodyWidth;
    this.bodyHeight = bodyHeight;
    this.lineWidth = lineWidth;
    this.linelength = linelength;
  }

  move(dx, dy) {
    this.start.x += dx;
    this.start.y += dy;
    this.end.x += dx;
    this.end.y += dy;
  }

  render(ctx, rc, { shadow = false, shadowOffset = 10 } = {}, topPoint = this.start, bottomPoint = this.end) {
    this.start = { ...topPoint };
    this.end = { ...bottomPoint };
    const length = this.end.y - this.start.y;
    const pistonTop = this.start.y + this.linelength;
    const pistonBottom = this.end.y - this.linelength;
    let newbodyheight = pistonBottom - pistonTop;
    const centerX = this.start.x;
    const halfWidth = this.bodyWidth / 2;

    const drawLine = (x1, y1, x2, y2, seed) => {
      if (shadow) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.filter = 'blur(2.5px)';
        ctx.beginPath();
        ctx.moveTo(x1 + shadowOffset, y1 + shadowOffset);
        ctx.lineTo(x2 + shadowOffset, y2 + shadowOffset);
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
        ctx.restore();
      } else if (rc) {
        ctx.save();
        ctx.filter = 'none';
        rc.line(x1, y1, x2, y2, { seed, strokeWidth: 0.5 });
        ctx.restore();
      } else {
        ctx.save();
        ctx.filter = 'blur(0px)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
        ctx.restore();
      }
    };

    drawLine(centerX, this.start.y, centerX, pistonTop, 1);
    drawLine(centerX, pistonBottom, centerX, this.end.y, 2);

    if (shadow) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.filter = 'blur(2.5px)';
      ctx.fillRect(centerX - halfWidth + shadowOffset, pistonTop + shadowOffset, this.bodyWidth, newbodyheight);
      ctx.restore();
    } else if (rc) {
      ctx.save();
      ctx.filter = 'none';
      rc.rectangle(centerX - halfWidth, pistonTop, this.bodyWidth, newbodyheight, { fill: 'white', fillStyle: 'solid', seed: 3 });
      rc.rectangle(centerX - halfWidth, pistonTop, this.bodyWidth, newbodyheight, { fill: 'grey', seed: 3 });
      
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = 'rgb(200,200,200)';
      ctx.fillRect(centerX - halfWidth, pistonTop, this.bodyWidth, newbodyheight);
      ctx.restore();
    }
  }

  getAnchorPoint(name = 'start') {
    if (name === 'end' || name === 'bottom') return { ...this.end };
    if (name === 'center') {
      return {
        x: (this.start.x + this.end.x) / 2,
        y: (this.start.y + this.end.y) / 2,
      };
    }
    if (name === 'top') return { ...this.start };
    return { ...this.start };
  }
}

export class Ground {
  constructor({
    x = 0,
    y = 0,
    width = 120,
    hatchCount = 30,
    hatchSpacing = 4,
    hatchLength = 7,
    hatchDrop = 7,
  } = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.hatchCount = hatchCount;
    this.hatchSpacing = hatchSpacing;
    this.hatchLength = hatchLength;
    this.hatchDrop = hatchDrop;
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  render(ctx, rc, { shadow = false, shadowOffset = 10 } = {}) {
    const hatchCount = Math.max(1, Math.ceil(this.width / this.hatchSpacing));
    const drawLine = (x1, y1, x2, y2, seed) => {
      if (shadow) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.filter = 'blur(2.5px)';
        ctx.beginPath();
        ctx.moveTo(x1 + shadowOffset, y1 + shadowOffset);
        ctx.lineTo(x2 + shadowOffset, y2 + shadowOffset);
        ctx.stroke();
        ctx.restore();
      } else if (rc) {
        ctx.save();
        ctx.filter = 'none';
        rc.line(x1, y1, x2, y2, { seed });
        ctx.restore();
      } else {
        ctx.save();
        ctx.filter = 'blur(0px)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    };

    drawLine(this.x, this.y, this.x + this.width, this.y, 1);
    for (let i = 0; i < hatchCount; i++) {
      const sx = this.x + i * this.hatchSpacing;
      drawLine(sx, this.y, sx + this.hatchLength, this.y + this.hatchDrop, 2 + i);
    }
  }

  getAnchorPoint(name = 'top') {
    switch (name) {
      case 'left':
        return { x: this.x, y: this.y };
      case 'right':
        return { x: this.x + this.width, y: this.y };
      case 'center':
        return { x: this.x + this.width / 2, y: this.y };
      case 'top':
      default:
        return { x: this.x + this.width / 2, y: this.y };
    }
  }

  anchorToPoint(name, point, mode = 'move') {
    const anchor = this.getAnchorPoint(name);
    if (mode === 'move') {
      this.x += point.x - anchor.x;
      this.y += point.y - anchor.y;
      return;
    }

    if (name === 'left') {
      const right = this.getAnchorPoint('right');
      this.x = point.x;
      this.width = Math.max(1, right.x - point.x);
    } else if (name === 'right') {
      this.width = Math.max(1, point.x - this.x);
    }
  }
}

export class MassSpringDamper {
  constructor({
    x = 0,
    y = 0,
    massWidth = 100,
    massHeight = 100,
    springLength = 160,
    spacing = null,
    showDamper = true,
    showGround = true,
    useGroundAnchor = showGround,
    groundX = null,
    groundY = null,
    groundWidth = null,
    groundFixed = true,
    labels = {},
    labelStyle = {},
    forceArrow = {},
  } = {}) {
    this.x = x;
    this.y = y;
    this.mass = new Mass({ x, y, width: massWidth, height: massHeight, fill: "grey" });
    this.spring = new Spring({
      start: { x, y: y + massHeight },
      end: { x, y: y + massHeight + springLength },
    });
    this.damper = new Damper({
      start: { x: x + massWidth / 2, y: y + massHeight },
      end: { x: x + massWidth / 2, y: y + massHeight + springLength },
    });
    const defaultGroundX = x - massWidth * 0.1;
    const defaultGroundY = y + massHeight + springLength;
    const defaultGroundWidth = massWidth * 1.2;
    this.ground = new Ground({
      x: groundX ?? defaultGroundX,
      y: groundY ?? defaultGroundY,
      width: groundWidth ?? defaultGroundWidth,
    });
    this.showDamper = showDamper;
    this.showGround = showGround;
    this.useGroundAnchor = useGroundAnchor;
    this.spacing = spacing ?? massWidth * 0.25;
    this.springLength = springLength;
    this.groundFixed = groundFixed;
    this.labels = {
      springLeft: labels.springLeft ?? null,
      damperRight: labels.damperRight ?? null,
      massCenter: labels.massCenter ?? null,
    };
    this.labelStyle = {
      font: labelStyle.font ?? "16px Arial, Helvetica, sans-serif",
      color: labelStyle.color ?? "#111",
      background: labelStyle.background ?? "rgba(255,255,255,0.9)",
      padding: labelStyle.padding ?? 4,
      blur: labelStyle.blur ?? 6,
      offset: labelStyle.offset ?? 23,
      springOffset: labelStyle.springOffset ?? null,
      damperOffset: labelStyle.damperOffset ?? null,
      smoothing: labelStyle.smoothing ?? 1,
    };
    this.forceArrow = {
      enabled: forceArrow.enabled ?? false,
      direction: forceArrow.direction ?? "right",
      anchor: forceArrow.anchor ?? "center",
      anchorT: forceArrow.anchorT ?? 0.5,
      length: forceArrow.length ?? 40,
      offset: forceArrow.offset ?? 12,
      headSize: forceArrow.headSize ?? 8,
      lineWidth: forceArrow.lineWidth ?? 3,
      color: forceArrow.color ?? "#f6a04d",
      label: forceArrow.label ?? null,
      labelOffset: forceArrow.labelOffset ?? 12,
      labelFont: forceArrow.labelFont ?? (labelStyle.font ?? "16px Arial, Helvetica, sans-serif"),
      labelColor: forceArrow.labelColor ?? "#f18f3b",
    };
    this._labelPositions = {
      springLeft: null,
      damperRight: null,
      massCenter: null,
    };
    this.layout();
  }

  setMassSize(width, height) {
    this.mass.width = width;
    this.mass.height = height;
    this.spacing = width * 0.25;
    this.layout();
  }

  setSpringLength(length) {
    this.springLength = length;
    this.layout();
  }

  setMassTop(point) {
    this.mass.anchorToPoint("top", point, "move");
    this.layout();
  }

  setMassPosition(x, y) {
    this.mass.x = x;
    this.mass.y = y;
    this.layout();
  }

  setForceArrow(options = {}) {
    this.forceArrow = { ...this.forceArrow, ...options };
  }

  layout() {
    this.x = this.mass.x;
    this.y = this.mass.y;
    const massBottom = this.mass.getAnchorPoint("bottom");
    const springStart = { x: massBottom.x - this.spacing, y: massBottom.y };
    const damperStart = { x: massBottom.x + this.spacing, y: massBottom.y };

    const groundY = this.ground.y;
    const anchoredLength = Math.max(0, groundY - springStart.y);
    const springEnd = this.useGroundAnchor ? { x: springStart.x, y: groundY } : { x: springStart.x, y: springStart.y + this.springLength };
    this.spring.start = { ...springStart };
    this.spring.end = { ...springEnd };

    const damperEnd = this.useGroundAnchor ? { x: damperStart.x, y: groundY } : { x: damperStart.x, y: damperStart.y + this.springLength };
    this.damper.start = { ...damperStart };
    this.damper.end = { ...damperEnd };
    if (!this.groundFixed) {
      const nextGroundY = Math.max(this.spring.end.y, this.damper.end.y);
      this.ground.x = this.mass.x - this.mass.width * 0.1;
      this.ground.y = nextGroundY;
      this.ground.width = this.mass.width * 1.2;
    }
  }

  render(ctx, rc, opts = {}, massPosition = null) {
    if (typeof massPosition === "number") {
      const t = Math.max(0, Math.min(1, massPosition));
      const lowestTop = this.ground.y - this.mass.height;
      const highestTop = lowestTop - this.springLength;
      this.mass.y = lowestTop + (highestTop - lowestTop) * t;
    }
    this.layout();
    if (opts.shadow) {
      this.mass.render(ctx, rc, opts);
      this.spring.render(ctx, rc, opts, this.spring.start, this.spring.end);
      if (this.showDamper) this.damper.render(ctx, rc, opts, this.damper.start, this.damper.end);
      if (this.showGround) this.ground.render(ctx, rc, opts);
      return;
    }

    this.mass.render(ctx, rc, opts);
    this.spring.render(ctx, rc, opts, this.spring.start, this.spring.end);
    if (this.showDamper) this.damper.render(ctx, rc, opts, this.damper.start, this.damper.end);
    if (this.showGround) this.ground.render(ctx, rc, opts);
    if (!opts.shadow && this.forceArrow.enabled) this.drawForceArrow(ctx);
    this.renderLabels(ctx);
  }

  getAnchorPoint(name, t = 0.5) {
    if (name === "massTop") {
      const clamped = Math.max(0, Math.min(1, t));
      return {
        x: this.mass.x + clamped * this.mass.width,
        y: this.mass.y,
      };
    }
    if (name === "ground") {
      return {
        x: (this.spring.end.x + this.damper.end.x) / 2,
        y: (this.spring.end.y + this.damper.end.y) / 2,
      };
    }
    return this.mass.getAnchorPoint("center");
  }

  renderLabels(ctx) {
    const { springLeft, damperRight, massCenter } = this.labels;
    if (!springLeft && !damperRight && !massCenter) return;

    const offset = this.labelStyle.offset;
    const springOffset = this.labelStyle.springOffset ?? offset;
    const damperOffset = this.labelStyle.damperOffset ?? offset;
    if (springLeft) {
      const springMid = this.spring.getAnchorPoint("center");
      const target = { x: springMid.x - springOffset, y: springMid.y };
      this.drawLabel(ctx, springLeft, this._smoothLabelPoint("springLeft", target), false);
    } else {
      this._labelPositions.springLeft = null;
    }
    if (damperRight) {
      const damperMid = this.damper.getAnchorPoint("center");
      const target = { x: damperMid.x + damperOffset, y: damperMid.y };
      this.drawLabel(ctx, damperRight, this._smoothLabelPoint("damperRight", target), false);
    } else {
      this._labelPositions.damperRight = null;
    }
    if (massCenter) {
      const massMid = this.mass.getAnchorPoint("center");
      this.drawLabel(ctx, massCenter, this._smoothLabelPoint("massCenter", massMid), true);
    } else {
      this._labelPositions.massCenter = null;
    }
  }

  _smoothLabelPoint(key, point) {
    const smoothing = Math.max(0, Math.min(1, this.labelStyle.smoothing));
    if (!Number.isFinite(smoothing) || smoothing >= 1) {
      this._labelPositions[key] = { ...point };
      return this._labelPositions[key];
    }

    const prev = this._labelPositions[key];
    if (!prev) {
      this._labelPositions[key] = { ...point };
      return this._labelPositions[key];
    }

    const next = {
      x: prev.x + (point.x - prev.x) * smoothing,
      y: prev.y + (point.y - prev.y) * smoothing,
    };
    this._labelPositions[key] = next;
    return next;
  }

  drawLabel(ctx, text, point, withBackground) {
    ctx.save();
    ctx.font = this.labelStyle.font;
    ctx.fillStyle = this.labelStyle.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const metrics = ctx.measureText(text);
    const pad = this.labelStyle.padding;
    const width = metrics.width + pad * 2;
    const height = 16 + pad * 2;
    const x = point.x - width / 2;
    const y = point.y - height / 2;

    if (withBackground) {
      ctx.shadowColor = this.labelStyle.background;
      ctx.shadowBlur = this.labelStyle.blur;
      ctx.fillStyle = this.labelStyle.background;
      ctx.fillRect(x, y, width, height);
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = this.labelStyle.color;
    ctx.fillText(text, point.x, point.y);
    ctx.restore();
  }

  drawForceArrow(ctx) {
    const {
      direction,
      anchor,
      anchorT,
      length,
      offset,
      headSize,
      lineWidth,
      color,
      label,
      labelOffset,
      labelFont,
      labelColor,
    } = this.forceArrow;
    const basePoint = this._getForceAnchorPoint(anchor, anchorT);
    const dir = this._getForceDirection(direction);
    const end = {
      x: basePoint.x + dir.x * offset,
      y: basePoint.y + dir.y * offset,
    };
    const start = {
      x: end.x - dir.x * length,
      y: end.y - dir.y * length,
    };

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const backAngle1 = angle + Math.PI - Math.PI / 6;
    const backAngle2 = angle + Math.PI + Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x + Math.cos(backAngle1) * headSize, end.y + Math.sin(backAngle1) * headSize);
    ctx.lineTo(end.x + Math.cos(backAngle2) * headSize, end.y + Math.sin(backAngle2) * headSize);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (label) {
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const normal = { x: -dir.y, y: dir.x };
      const labelPoint = {
        x: mid.x + normal.x * labelOffset,
        y: mid.y + normal.y * labelOffset,
      };
      ctx.save();
      ctx.font = labelFont;
      ctx.fillStyle = labelColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, labelPoint.x, labelPoint.y);
      ctx.restore();
    }
  }

  _getForceAnchorPoint(anchor, anchorT = 0.5) {
    if (anchor === "massTop") return this.getAnchorPoint("massTop", anchorT);
    if (anchor === "topLeft") return { x: this.mass.x, y: this.mass.y };
    if (anchor === "topRight") return { x: this.mass.x + this.mass.width, y: this.mass.y };
    if (anchor === "bottomLeft") return { x: this.mass.x, y: this.mass.y + this.mass.height };
    if (anchor === "bottomRight") return { x: this.mass.x + this.mass.width, y: this.mass.y + this.mass.height };
    if (anchor === "top") return this.mass.getAnchorPoint("top");
    if (anchor === "bottom") return this.mass.getAnchorPoint("bottom");
    if (anchor === "left") return this.mass.getAnchorPoint("left");
    if (anchor === "right") return this.mass.getAnchorPoint("right");
    return this.mass.getAnchorPoint("center");
  }

  _getForceDirection(direction) {
    switch (direction) {
      case "left":
        return { x: -1, y: 0 };
      case "up":
        return { x: 0, y: -1 };
      case "down":
        return { x: 0, y: 1 };
      case "right":
      default:
        return { x: 1, y: 0 };
    }
  }
}

export class MassSpringDamperSystemTimeFreqDomainHandmade { // Input should be math matrices.
  constructor({
    Massmatrix = null,
    Dampingmatrix = null,
    Stiffnessmatrix = null,
    Maxtimestep = 1,
    StartingPositions = null,
    StartingVelocities = null,
  } = {}) {
    this.Massmatrix = Massmatrix;
    this.Dampingmatrix = Dampingmatrix;
    this.Stiffnessmatrix = Stiffnessmatrix ? math.matrix(Stiffnessmatrix) : null;
    this.Maxtimestep = Maxtimestep;

    const size = this.Massmatrix?.size ? this.Massmatrix.size()[0] : 0;
    if (StartingPositions == null) {
      StartingPositions = size ? math.zeros(size, 1) : null;
    }
    if (StartingVelocities == null) {
      StartingVelocities = size ? math.zeros(size, 1) : null;
    }

    this.Currentposition = StartingPositions;
    this.Currentvelocity = StartingVelocities;

    this._buildStateSpace();

    this.state = math.concat(this.Currentvelocity, this.Currentposition);

    this.ForceType = 'step';
    //For steps after time 0
    this.ForceApplicationtime1 = null;
    this.ForceApplicationtime2 = null;
    this.ForceRampStart = 0;
    this.ForceRampupTime = null;
    this.Forcefrequency = 1;
    this.Amplitude = math.identity([size,size]) * this.Amplitude;

    this.lastanim = 0;
    this.Starttime = 0;
  }

  reinitialize({ StartingPositions = null, StartingVelocities = null } = {}) {
    const size = this.Massmatrix?.size ? this.Massmatrix.size()[0] : 0;
    if (StartingPositions == null) {
      StartingPositions = size ? math.zeros(size, 1) : null;
    }
    if (StartingVelocities == null) {
      StartingVelocities = size ? math.zeros(size, 1) : null;
    }

    this.Currentposition = StartingPositions;
    this.Currentvelocity = StartingVelocities;

    this.state = math.flatten(math.concat(this.Currentvelocity, this.Currentposition));

    this.Starttime = Date.now();
  }

  set AppliedForceParameters({
    ForceType = 'step',
    Amplitude = 1,
    ForceApplicationtime1 = null,
    ForceApplicationtime2 = null,
    Forcefrequency = 1,
    ForceRampStart = null,
    ForceRampupTime = null,
  } = {}) {
    this.ForceType = ForceType;
    this.Amplitude = Amplitude;
    this.ForceApplicationtime1 = ForceApplicationtime1;
    this.ForceApplicationtime2 = ForceApplicationtime2;
    this.Forcefrequency = Forcefrequency;
    this.ForceRampStart = ForceRampStart;
    this.ForceRampupTime = ForceRampupTime;
  }

  setMassmatrix(Massmatrix) {
    if (isMatrix(Massmatrix)) {
      this.Massmatrix = Massmatrix;
    } else {
      throw new Error('Massmatrix must be a math matrix');
    }
    this._buildStateSpace();
  }
  setDampingmatrix(Dampingmatrix) {
    if (isMatrix(Dampingmatrix)) {
      this.Dampingmatrix = Dampingmatrix;
    } else {
      throw new Error('Dampingmatrix must be a math matrix');
    }     
    this.Dampingmatrix = Dampingmatrix;
    this._buildStateSpace();
  }
  setStiffnessmatrix(Stiffnessmatrix) {
    if (isMatrix(Stiffnessmatrix)) {
      this.Stiffnessmatrix = Stiffnessmatrix;
    } else {
      throw new Error('Stiffnessmatrix must be a math matrix');
    }     
    this.Stiffnessmatrix = Stiffnessmatrix;
    this._buildStateSpace();
  }

  _buildStateSpace() {
    const size = this.Massmatrix?.size ? this.Massmatrix.size()[0] : 0;
    if (!size) {
      this._A = null;
      this._B = null;
      this._C = null;
      return;
    }

    let A_Top = math.concat(
      math.multiply(-1, this.Dampingmatrix, math.inv(this.Massmatrix)),
      math.multiply(-1, this.Stiffnessmatrix, math.inv(this.Massmatrix)),
      1
    );
    let A_Bottom = math.concat(
      math.identity(size),
      math.zeros([size, size]),
      1
    );
    let A = math.concat(A_Top, A_Bottom, 0);

    let B = math.multiply(math.inv(this.Massmatrix), math.ones([size, 1]));
    B = math.concat(B, math.zeros([size, 1]), 0);
    B = math.matrix(B);

    let C_Upper = math.concat(math.identity(size), math.zeros([size, size]), 1);
    let C_Lower = math.concat(math.zeros([size, size]), math.identity(size), 1);
    let C = math.concat(C_Upper, C_Lower, 0);
    try{
      this.eigs = math.eigs(A);
    }
    catch{
      this.eigs = undefined;
    }


    this._A = A;
    this._B = B;
    this._C = C;
  }

  getEigenvaluesAndVectors()
  {  
      if (typeof this.eigs !== "undefined") {
        return this.eigs;
      } else {
        return null;
      }
  }

  _timewithintimeframe(t,t1,t2)
  {
    if ((t1 != null)  && (t2 != null))
    {
      return (t >= t1) && (t <= t2);
    }
    else if (t1 != null)
    {
      return (t >= t1);
    }
    else if (t2 != null)
    {
      return (t <= t2);
    }
  }
  calcForceAtTime(t) {
    let force = math.zeros(this.Massmatrix.size()[0], 1);
    if (this.ForceType === 'step') {
      if (this.ForceApplicationtime1 != null && t >= this.ForceApplicationtime1) {
        force = math.add(force, math.multiply(this.Amplitude, 1));
      }
    } else if (this.ForceType === 'impulse') {
      if (this.ForceApplicationtime1 != null && Math.abs(t - this.ForceApplicationtime1) < 1e-6) {
        force = math.add(force, math.multiply(this.Amplitude, 1));
      }
    } else if (this.ForceType === 'sine') {
        let rampScale = 1;
        if (Number.isFinite(this.ForceRampupTime) && this.ForceRampupTime > 0) {
          const start = Number.isFinite(this.ForceRampStart) ? this.ForceRampStart : 0;
          const elapsed = t - start;
          if (elapsed <= 0) {
            rampScale = 0;
          } else if (elapsed < this.ForceRampupTime) {
            const phase = (Math.PI * elapsed) / this.ForceRampupTime;
            rampScale = 0.5 * (1 - Math.cos(phase));
          }
        }
        const scaled = Math.sin(2 * Math.PI * this.Forcefrequency * t) * rampScale;
        force = math.multiply(this.Amplitude, scaled).toArray();
    }
    return force;
  } 
  
  getFullTimeFunction(timesteps, whichmass, resulttype = 'position') {
    const size = timesteps.length;
    let positions = math.zeros(size, self.Massmatrix.size()[0]);
    let velocities = math.zeros(size, self.Massmatrix.size()[0]);

    positions[0] = this.Currentposition;
    velocities[0] = this.Currentvelocity;


    for (let index = 1; index < size; index++) {
      let f = this.calcForceAtTime(timesteps[index]); //calculate force at time

      //calculate new state
      let state = math.concat(positions[index - 1], velocities[index - 1], 0);
      let dt = timesteps[index] - timesteps[index - 1];
      let Adt = math.add(math.identity(state.size()[0]), math.multiply(this._A, dt));
      let Bdt = math.multiply(this._B, dt);
      let newstate = math.add(math.multiply(Adt, state), math.multiply(Bdt, f));
      
      //update positions and velocities
      positions[index] = newstate.subset(math.index(math.range(0, this.Massmatrix.size()[0]), 0));
      velocities[index] = newstate.subset(math.index(math.range(this.Massmatrix.size()[0], 2 * this.Massmatrix.size()[0]), 0));

    }
        
    if (resulttype === 'position') {
      return positions.map((row) => row[whichmass]);
    } else if (resulttype === 'velocity') {
      return velocities.map((row) => row[whichmass]);
    } else {
      throw new Error(`Invalid resulttype: ${resulttype}`);
    } 
   }

   getBodePlotData(frequencyRange, whichmass, resulttype = 'magnitude', inputIndex = 0) {
    const size = frequencyRange.length;
    let magnitudes = new Array(size).fill(0);
    let phases = new Array(size).fill(0);

    for (let index = 0; index < size; index++) {
      const freq = frequencyRange[index];
      const omega = 2 * Math.PI * freq;
      const I = math.complex(0, 1);
      const s = math.multiply(I, omega);

      const Ms = math.add(this.Stiffnessmatrix, math.multiply(s, this.Dampingmatrix), math.multiply(s, s, this.Massmatrix));
      const MsInv = math.inv(Ms);
      const H = MsInv;

      const H_elem = H.subset(math.index(whichmass, inputIndex));
      const magnitude = math.abs(H_elem);
      const phase = math.arg(H_elem) * (180 / Math.PI);

      magnitudes[index] = magnitude;
      phases[index] = phase;
    }

    if (resulttype === 'magnitude') {
      return magnitudes;
    } else if (resulttype === 'phase') {
      return phases;
    } else {
      throw new Error(`Invalid resulttype: ${resulttype}`);
    }
  }   
   
    stepSimulation(t) {

      if (this.lastanim == 0) 
        this.lastanim = t;

      if (this.Starttime == 0)
        this.Starttime = t;
      //let state = math.concat(this.Currentvelocity, this.Currentposition);

      const CalculateStatechange = (dt, currentstate) => {

        let f = this.calcForceAtTime(t+dt).concat(math.flatten(math.zeros(this.Massmatrix.size()[0],1).toArray()));


        let newstate = math.multiply(this._A ,math.transpose(currentstate));        
        let newstate2 = math.dotMultiply(math.matrix(math.flatten(this._B).toArray()), f);
        return( math.flatten(math.add(math.flatten(newstate), newstate2)).toArray());

        //newstate = math.add(this.state, math.multiply(newstate, dt));
      }

      let dt = t-this.lastanim; 
      if (dt > 10) dt = 10;
      let result = math.solveODE(CalculateStatechange,[0,dt],[this.state], {maxStep:0.1});
      this.lastanim = t;
      this.state = math.flatten(result.y[result.y.length - 1]);

      //let newstate = math.multiply(this._A , math.matrix(this.state));
      //let newstate2 = math.flatten(math.dotMultiply(math.matrix(this._B),math.matrix( f) ));
      //newstate = math.add(newstate, newstate2); 
      //newstate = math.add(this.state, math.multiply(newstate, dt));

      let veloAndPos = math.multiply(this._C, math.transpose( this.state ));
      veloAndPos = math.flatten(veloAndPos);

      const size = this.Massmatrix.size()[0];
      this.Currentvelocity = math.subset(
        veloAndPos,
        math.index(math.range(0, size))
      );

      this.Currentposition   = math.subset(
      veloAndPos,
      math.index(math.range(size, 2 * size))
    );
      return {
        position: this.Currentposition,
        velocity: this.Currentvelocity,
      };      
  }   

}


export class MultiMassSpringDamperTimeSystem {
  constructor({ Mass = 1, Damping = 0.2, Stiffness = 1, NumMasses = 3, TimeStep = 0.02 } = {}) {
    this.Mass = Mass;
    this.Damping = Damping;
    this.Stiffness = Stiffness;
    this.NumMasses = NumMasses;
    this.TimeStep = TimeStep;

    this.positions = new Array(NumMasses).fill(0);
    this.velocities = new Array(NumMasses).fill(0);
    this.forces = new Array(NumMasses).fill(0);

    this._A = null;
    this._B = null;
    this._lastTime = null;
  }

  applyForce(massIndex, force) {
    if (massIndex < 0 || massIndex >= this.NumMasses) return;
    this.forces[massIndex] += force;
  }

  _createMatrix(rows, cols, fillValue = 0) {
    const data = new Array(rows * cols).fill(fillValue);
    const matrix = new matrixmath.Matrix(rows, cols, false);
    matrix.setData(data, rows, cols);
    return matrix;
  }

  _expandArray(values, length, fallback) {
    const out = new Array(length);
    for (let i = 0; i < length; i++) {
      const v = Array.isArray(values) ? values[i] : undefined;
      if (Number.isFinite(v)) {
        out[i] = v;
      } else if (i > 0) {
        out[i] = out[i - 1];
      } else {
        out[i] = fallback;
      }
    }
    return out;
  }

  _getMassArray() {
    const n = this.NumMasses;
    if (Array.isArray(this.Mass)) {
      const values = this._expandArray(this.Mass, n, 1);
      return values.map((v) => (Number.isFinite(v) && v > 0 ? v : 1));
    }
    const value = Number.isFinite(this.Mass) && this.Mass > 0 ? this.Mass : 1;
    return new Array(n).fill(value);
  }

  _getSpringArrays(value) {
    const n = this.NumMasses;
    if (Array.isArray(value)) {
      if (value.length >= n) {
        const values = this._expandArray(value, n, 0);
        return {
          ground: Math.max(0, values[0]),
          between: values.slice(1).map((v) => Math.max(0, v)),
        };
      }
      const between = this._expandArray(value, n - 1, 0).map((v) => Math.max(0, v));
      return { ground: 0, between };
    }
    const scalar = Number.isFinite(value) ? Math.max(0, value) : 0;
    return { ground: 0, between: new Array(n - 1).fill(scalar) };
  }

  _buildStateSpace() {
    const n = this.NumMasses;
    const masses = this._getMassArray();
    const invM = masses.map((m) => 1 / m);
    const { ground: kGround, between: kBetween } = this._getSpringArrays(this.Stiffness);
    const { ground: cGround, between: cBetween } = this._getSpringArrays(this.Damping);

    const K = this._createMatrix(n, n, 0);
    const C = this._createMatrix(n, n, 0);

    if (kGround) K[0] += kGround;
    if (cGround) C[0] += cGround;

    for (let i = 0; i < n - 1; i++) {
      const k = kBetween[i] ?? 0;
      const c = cBetween[i] ?? 0;
      if (k) {
        K[i * n + i] += k;
        K[(i + 1) * n + (i + 1)] += k;
        K[i * n + (i + 1)] -= k;
        K[(i + 1) * n + i] -= k;
      }
      if (c) {
        C[i * n + i] += c;
        C[(i + 1) * n + (i + 1)] += c;
        C[i * n + (i + 1)] -= c;
        C[(i + 1) * n + i] -= c;
      }
    }

    const A = this._createMatrix(2 * n, 2 * n, 0);
    const B = this._createMatrix(2 * n, n, 0);

    for (let i = 0; i < n; i++) {
      A[i * 2 * n + (n + i)] = 1;
    }

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        A[(n + row) * 2 * n + col] = -invM[row] * K[row * n + col];
        A[(n + row) * 2 * n + (n + col)] = -invM[row] * C[row * n + col];
      }
      B[(n + row) * n + row] = invM[row];
    }

    this._A = A;
    this._B = B;
  }

  _buildComplexSolveMatrix(omega) {
    const size = this._A.rows;
    const blockSize = size * 2;
    const block = this._createMatrix(blockSize, blockSize, 0);
    const A = this._A;
    const w = omega;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const aVal = A[r * size + c];
        block[r * blockSize + c] = -aVal;
        block[r * blockSize + (c + size)] = -w * (r === c ? 1 : 0);
        block[(r + size) * blockSize + c] = w * (r === c ? 1 : 0);
        block[(r + size) * blockSize + (c + size)] = -aVal;
      }
    }

    return block;
  }

  transferFunction(omega, { inputIndex = 0, outputIndex = 0, outputType = "position" } = {}) {
    if (!this._A || !this._B) this._buildStateSpace();
    const size = this._A.rows;
    const n = this.NumMasses;
    if (inputIndex < 0 || inputIndex >= n) return null;
    if (outputIndex < 0 || outputIndex >= n) return null;

    const u = new matrixmath.Matrix(n, 1, false);
    const uData = new Array(n).fill(0);
    uData[inputIndex] = 1;
    u.setData(uData, n, 1);
    const b = matrixmath.Matrix.multiply(this._B, u);

    const block = this._buildComplexSolveMatrix(omega);
    const rhs = this._createMatrix(size * 2, 1, 0);
    const bData = b.toArray();
    for (let i = 0; i < size; i++) rhs[i] = bData[i];

    const xComplex = block.clone().invert().multiply(rhs);
    const xData = xComplex.toArray();
    const xReal = xData.slice(0, size);
    const xImag = xData.slice(size);

    const stateIndex = outputType === "velocity" ? n + outputIndex : outputIndex;
    const real = xReal[stateIndex];
    const imag = xImag[stateIndex];
    const magnitude = Math.sqrt(real * real + imag * imag);
    const phase = Math.atan2(imag, real);

    return { real, imag, magnitude, phase };
  }

  _getStateMatrix() {
    const n = this.NumMasses;
    const data = new Array(2 * n);
    for (let i = 0; i < n; i++) data[i] = this.positions[i];
    for (let i = 0; i < n; i++) data[n + i] = this.velocities[i];
    const state = new matrixmath.Matrix(2 * n, 1, false);
    state.setData(data, 2 * n, 1);
    return state;
  }

  _setStateFromMatrix(state) {
    const n = this.NumMasses;
    const data = state.toArray();
    for (let i = 0; i < n; i++) this.positions[i] = data[i];
    for (let i = 0; i < n; i++) this.velocities[i] = data[n + i];
  }

  _derivative(stateMatrix, inputMatrix) {
    const Ax = matrixmath.Matrix.multiply(this._A, stateMatrix);
    const Bu = matrixmath.Matrix.multiply(this._B, inputMatrix);
    return matrixmath.Matrix.add(Ax, Bu);
  }

  step(timeNow = null) {
    if (!this._A || !this._B) this._buildStateSpace();

    const n = this.NumMasses;
    const u = new matrixmath.Matrix(n, 1, false);
    u.setData([...this.forces], n, 1);
    const x = this._getStateMatrix();

    const rawDt =
      typeof timeNow === "number"
        ? (this._lastTime === null ? 0 : timeNow - this._lastTime)
        : this.TimeStep;
    const dt = Math.min(rawDt, this.TimeStep);
    if (typeof timeNow === "number") this._lastTime = timeNow;
    if (dt <= 0) {
      this.forces.fill(0);
      return;
    }

    const k1 = this._derivative(x, u);
    const k2 = this._derivative(
      matrixmath.Matrix.add(x, matrixmath.Matrix.multiply(k1, dt / 2)),
      u
    );
    const k3 = this._derivative(
      matrixmath.Matrix.add(x, matrixmath.Matrix.multiply(k2, dt / 2)),
      u
    );
    const k4 = this._derivative(
      matrixmath.Matrix.add(x, matrixmath.Matrix.multiply(k3, dt)),
      u
    );
    const sumK = matrixmath.Matrix.add(
      k1,
      matrixmath.Matrix.multiply(k2, 2),
      matrixmath.Matrix.multiply(k3, 2),
      k4
    );
    const xNext = matrixmath.Matrix.add(x, matrixmath.Matrix.multiply(sumK, dt / 6));

    this._setStateFromMatrix(xNext);
    this.forces.fill(0);
  }

  setMass(value) {
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      this.Mass = value.slice();
      this._A = null;
      this._B = null;
      return;
    }
    if (!Number.isFinite(value) || value <= 0) return;
    this.Mass = value;
    this._A = null;
    this._B = null;
  }

  setDamping(value) {
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      this.Damping = value.slice();
      this._A = null;
      this._B = null;
      return;
    }
    if (!Number.isFinite(value) || value < 0) return;
    this.Damping = value;
    this._A = null;
    this._B = null;
  }

  setStiffness(value) {
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      this.Stiffness = value.slice();
      this._A = null;
      this._B = null;
      return;
    }
    if (!Number.isFinite(value) || value < 0) return;
    this.Stiffness = value;
    this._A = null;
    this._B = null;
  }

  setParameters({ Mass, Damping, Stiffness } = {}) {
    let dirty = false;
    if (Array.isArray(Mass) && Mass.length > 0) {
      this.Mass = Mass.slice();
      dirty = true;
    } else if (Number.isFinite(Mass) && Mass > 0) {
      this.Mass = Mass;
      dirty = true;
    }
    if (Array.isArray(Damping) && Damping.length > 0) {
      this.Damping = Damping.slice();
      dirty = true;
    } else if (Number.isFinite(Damping) && Damping >= 0) {
      this.Damping = Damping;
      dirty = true;
    }
    if (Array.isArray(Stiffness) && Stiffness.length > 0) {
      this.Stiffness = Stiffness.slice();
      dirty = true;
    } else if (Number.isFinite(Stiffness) && Stiffness >= 0) {
      this.Stiffness = Stiffness;
      dirty = true;
    }
    if (dirty) {
      this._A = null;
      this._B = null;
    }
  }
}
