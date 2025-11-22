import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CdkDrag, CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { Subscription, fromEvent } from 'rxjs';

import { FormConfiguration } from '../../services/form-config.service';
import { FormSection, FormField } from '../reusable-form/reusable-form.component';
import {
  FlowNode,
  FlowConnection,
  FlowNodeType,
  NodePosition,
  NodeConnections,
  NodeProperties,
  FlowValidationRule,
  OptionValue
} from '../../models/template.models';

// Additional interfaces for component palette
export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;
  targetPort: string;
}

export interface ComponentCategory {
  type: FlowNodeType;
  label: string;
  icon: string;
  description: string;
  items: ComponentItem[];
}

export interface ComponentItem {
  type: string;
  label: string;
  icon: string;
  defaultProperties: Partial<NodeProperties>;
}

@Component({
  selector: 'app-flow-form-designer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatCheckboxModule,
    DragDropModule
  ],
  templateUrl: './flow-form-designer.component.html',
  styleUrl: './flow-form-designer.component.css'
})
export class FlowFormDesignerComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('flowCanvas', { static: true }) flowCanvas!: ElementRef<HTMLDivElement>;
  @ViewChild('connectionSvg', { static: true }) connectionSvg!: ElementRef<SVGElement>;

  @Input() initialConfiguration?: FormConfiguration;
  @Input() readonly: boolean = false;

  @Output() configurationChange = new EventEmitter<FormConfiguration>();
  @Output() nodeSelected = new EventEmitter<FlowNode | null>();
  @Output() blueprintCreated = new EventEmitter<FormConfiguration>();

  // Reactive state using signals
  formNodes = signal<FlowNode[]>([]);
  nodeConnections = signal<NodeConnection[]>([]);
  selectedNode = signal<FlowNode | null>(null);
  isLoading = signal<boolean>(false);
  isDirty = signal<boolean>(false);
  canvasScale = signal<number>(1);
  canvasOffset = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // Computed properties
  hasNodes = computed(() => this.formNodes().length > 0);
  selectedNodeProperties = computed(() => this.selectedNode()?.properties || {});
  canCompile = computed(() => this.formNodes().length > 0 && this.formNodes().some(n => n.type === 'input'));

  // Form for node properties
  nodePropertyForm!: FormGroup;

  // Component categories for the palette
  componentCategories: ComponentCategory[] = [
    {
      type: 'input',
      label: 'Input Components',
      icon: 'input',
      description: 'Form input fields and controls',
      items: [
        { type: 'text', label: 'Text Input', icon: 'text_fields', defaultProperties: { fieldType: 'text' } },
        { type: 'email', label: 'Email Input', icon: 'email', defaultProperties: { fieldType: 'email' } },
        { type: 'number', label: 'Number Input', icon: 'numbers', defaultProperties: { fieldType: 'number' } },
        { type: 'select', label: 'Dropdown', icon: 'arrow_drop_down', defaultProperties: { fieldType: 'select' } },
        { type: 'checkbox', label: 'Checkbox', icon: 'check_box', defaultProperties: { fieldType: 'checkbox' } },
        { type: 'date', label: 'Date Picker', icon: 'date_range', defaultProperties: { fieldType: 'date' } },
        { type: 'signature', label: 'Digital Signature', icon: 'draw', defaultProperties: { fieldType: 'signature' } },
        { type: 'picture', label: 'Picture Upload', icon: 'add_a_photo', defaultProperties: { fieldType: 'picture' } },
        { type: 'map', label: 'Location Picker', icon: 'map', defaultProperties: { fieldType: 'map' } }
      ]
    },
    {
      type: 'logic',
      label: 'Logic Gates',
      icon: 'account_tree',
      description: 'Conditional logic and flow control',
      items: [
        { type: 'condition', label: 'Condition Gate', icon: 'alt_route', defaultProperties: {} },
        { type: 'validation_gate', label: 'Validation Gate', icon: 'verified_user', defaultProperties: {} },
        { type: 'calculation', label: 'Calculation', icon: 'calculate', defaultProperties: {} }
      ]
    },
    {
      type: 'section',
      label: 'Organizational',
      icon: 'view_module',
      description: 'Form structure and organization',
      items: [
        { type: 'section', label: 'Form Section', icon: 'view_module', defaultProperties: {} },
        { type: 'label', label: 'Display Label', icon: 'label', defaultProperties: { fieldType: 'label' } }
      ]
    }
  ];

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.initializeComponent();
    this.setupCanvasInteractions();
    this.buildPropertyForm();

    if (this.initialConfiguration) {
      this.loadConfigurationAsFlow(this.initialConfiguration);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeComponent(): void {
    // Initialize with empty state
    this.formNodes.set([]);
    this.nodeConnections.set([]);
    this.selectedNode.set(null);
  }

  private setupCanvasInteractions(): void {
    const canvas = this.flowCanvas.nativeElement;

    // Pan and zoom functionality
    const mouseDown$ = fromEvent<MouseEvent>(canvas, 'mousedown');
    const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');
    const wheel$ = fromEvent<WheelEvent>(canvas, 'wheel');

    // Handle canvas panning
    const panSubscription = mouseDown$.subscribe(startEvent => {
      if (startEvent.button === 1 || (startEvent.button === 0 && startEvent.ctrlKey)) {
        startEvent.preventDefault();
        const startOffset = this.canvasOffset();

        const moveSubscription = mouseMove$.subscribe(moveEvent => {
          const deltaX = moveEvent.clientX - startEvent.clientX;
          const deltaY = moveEvent.clientY - startEvent.clientY;

          this.canvasOffset.set({
            x: startOffset.x + deltaX,
            y: startOffset.y + deltaY
          });
        });

        const upSubscription = mouseUp$.subscribe(() => {
          moveSubscription.unsubscribe();
          upSubscription.unsubscribe();
        });
      }
    });

    // Handle canvas zooming
    const zoomSubscription = wheel$.subscribe(event => {
      event.preventDefault();
      const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.1, Math.min(3, this.canvasScale() * scaleFactor));
      this.canvasScale.set(newScale);
    });

    this.subscriptions.push(panSubscription, zoomSubscription);
  }

  private buildPropertyForm(): void {
    this.nodePropertyForm = this.fb.group({
      label: ['', Validators.required],
      required: [false],
      placeholder: [''],
      description: [''],
      fieldType: ['text'],
      validation: this.fb.array([]),
      options: this.fb.array([])
    });
  }

  // Patent-Safe: Component addition via menu selection
  addComponentToFlow(category: ComponentCategory, item: ComponentItem): void {
    if (this.readonly) return;

    const newNode: FlowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: category.type,
      label: item.label,
      position: this.getNextAvailablePosition(),
      properties: {
        ...item.defaultProperties,
        label: item.label,
        required: false
      },
      connections: {
        inputs: [],
        outputs: [],
        dependencies: []
      },
      isSelected: false,
      isValid: true
    };

    this.formNodes.update(nodes => [...nodes, newNode]);
    this.selectNode(newNode);
    this.markAsDirty();

    this.snackBar.open(`${item.label} added to flow`, 'Dismiss', {
      duration: 2000
    });
  }

  private getNextAvailablePosition(): NodePosition {
    const existingNodes = this.formNodes();
    const canvasRect = this.flowCanvas.nativeElement.getBoundingClientRect();

    // Simple grid layout for new nodes
    const gridSize = 200;
    const columns = Math.floor(canvasRect.width / gridSize);
    const row = Math.floor(existingNodes.length / columns);
    const col = existingNodes.length % columns;

    return {
      x: 50 + col * gridSize,
      y: 50 + row * 150,
      width: 180,
      height: 100
    };
  }

  selectNode(node: FlowNode | null): void {
    // Update selection state
    this.formNodes.update(nodes =>
      nodes.map(n => ({ ...n, isSelected: n.id === node?.id }))
    );

    this.selectedNode.set(node);
    this.nodeSelected.emit(node);

    // Update property form
    if (node) {
      this.nodePropertyForm.patchValue(node.properties);
    }
  }

  onNodePropertyChange(property: string, value: any): void {
    const selectedNode = this.selectedNode();
    if (!selectedNode || this.readonly) return;

    const updatedNode = {
      ...selectedNode,
      properties: {
        ...selectedNode.properties,
        [property]: value
      }
    };

    this.formNodes.update(nodes =>
      nodes.map(n => n.id === selectedNode.id ? updatedNode : n)
    );

    this.selectedNode.set(updatedNode);
    this.markAsDirty();
  }

  removeSelectedNode(): void {
    const selectedNode = this.selectedNode();
    if (!selectedNode || this.readonly) return;

    // Remove node and its connections
    this.formNodes.update(nodes => nodes.filter(n => n.id !== selectedNode.id));
    this.nodeConnections.update(connections =>
      connections.filter(c =>
        c.sourceNodeId !== selectedNode.id && c.targetNodeId !== selectedNode.id
      )
    );

    this.selectedNode.set(null);
    this.markAsDirty();

    this.snackBar.open('Node removed from flow', 'Dismiss', {
      duration: 2000
    });
  }

  // Patent-Safe: Flow compilation instead of direct generation
  compileFlowToFormConfig(): FormConfiguration {
    if (!this.canCompile()) {
      throw new Error('Cannot compile flow: No input nodes found');
    }

    const nodes = this.formNodes();
    const connections = this.nodeConnections();

    // Group nodes by sections
    const sectionNodes = nodes.filter(n => n.type === 'section');
    const inputNodes = nodes.filter(n => n.type === 'input');

    // Create sections from flow
    const compiledSections = this.compileNodesToSections(nodes, connections);

    const config: FormConfiguration = {
      id: `flow_compiled_${Date.now()}`,
      name: 'Flow-Generated Form',
      formType: 'custom',
      version: '1.0.0',
      isDefault: false,
      isActive: true,
      sections: compiledSections,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'flow-designer',
        description: 'Generated from flow-based designer'
      }
    };

    this.blueprintCreated.emit(config);
    return config;
  }

  private compileNodesToSections(nodes: FlowNode[], connections: NodeConnection[]): FormSection[] {
    const inputNodes = nodes.filter(n => n.type === 'input');
    const sectionNodes = nodes.filter(n => n.type === 'section');

    if (sectionNodes.length === 0) {
      // Create single section with all inputs
      return [{
        title: 'Form Fields',
        description: 'Fields compiled from flow designer',
        expanded: true,
        fields: inputNodes.map(node => this.compileNodeToField(node, connections))
      }];
    }

    // Create sections based on section nodes
    return sectionNodes.map(sectionNode => ({
      title: sectionNode.properties.label || sectionNode.label,
      description: sectionNode.properties.description || '',
      expanded: true,
      fields: this.getFieldsForSection(sectionNode, inputNodes, connections)
    }));
  }

  private compileNodeToField(node: FlowNode, connections: NodeConnection[]): FormField {
    const props = node.properties;

    return {
      name: this.generateFieldName(node.label),
      label: props.label || node.label,
      type: props.fieldType as any || 'text',
      required: props.required || false,
      placeholder: props.placeholder || '',
      options: props.options || [],
      validators: this.compileValidationRules(props.validation || []),
      conditional: this.compileConditionalLogic(node, connections)
    };
  }

  private generateFieldName(label: string): string {
    return label.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private getFieldsForSection(sectionNode: FlowNode, inputNodes: FlowNode[], connections: NodeConnection[]): FormField[] {
    // Find inputs connected to this section
    const connectedInputs = inputNodes.filter(input =>
      connections.some(conn =>
        conn.sourceNodeId === sectionNode.id && conn.targetNodeId === input.id
      )
    );

    return connectedInputs.map(node => this.compileNodeToField(node, connections));
  }

  private compileValidationRules(rules: FlowValidationRule[]): any[] {
    return rules.map(rule => {
      switch (rule.type) {
        case 'required': return { required: true };
        case 'email': return { email: true };
        case 'minLength': return { minLength: rule.value };
        case 'maxLength': return { maxLength: rule.value };
        case 'pattern': return { pattern: rule.value };
        default: return {};
      }
    });
  }

  private compileConditionalLogic(node: FlowNode, connections: NodeConnection[]): any {
    // Find logic gates connected to this input
    const logicConnections = connections.filter(conn => conn.targetNodeId === node.id);

    if (logicConnections.length === 0) return undefined;

    // Simple conditional logic compilation
    const logicConnection = logicConnections[0];
    return {
      dependsOn: logicConnection.sourceNodeId,
      showWhen: 'hasValue' // Default condition
    };
  }

  private loadConfigurationAsFlow(config: FormConfiguration): void {
    // Convert existing configuration to flow nodes
    const nodes: FlowNode[] = [];
    let nodeIndex = 0;

    config.sections.forEach((section, sectionIndex) => {
      // Create section node
      const sectionNode: FlowNode = {
        id: `section_${sectionIndex}`,
        type: 'section',
        label: section.title,
        position: { x: 50, y: 50 + sectionIndex * 200 },
        properties: {
          label: section.title,
          description: section.description
        },
        connections: { inputs: [], outputs: [], dependencies: [] }
      };
      nodes.push(sectionNode);

      // Create field nodes
      section.fields.forEach((field, fieldIndex) => {
        const fieldNode: FlowNode = {
          id: `field_${nodeIndex++}`,
          type: 'input',
          label: field.label,
          position: { x: 300, y: 50 + sectionIndex * 200 + fieldIndex * 120 },
          properties: {
            label: field.label,
            fieldType: field.type,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options
          },
          connections: { inputs: [sectionNode.id], outputs: [], dependencies: [] }
        };
        nodes.push(fieldNode);
        sectionNode.connections.outputs.push(fieldNode.id);
      });
    });

    this.formNodes.set(nodes);
  }

  private markAsDirty(): void {
    this.isDirty.set(true);
    this.configurationChange.emit(this.compileFlowToFormConfig());
  }

  // Canvas interaction methods
  onCanvasClick(event: MouseEvent): void {
    // Clear selection if clicking on empty canvas
    if (event.target === this.flowCanvas.nativeElement) {
      this.selectNode(null);
    }
  }

  onNodeDragEnd(event: CdkDragDrop<any>, node: FlowNode): void {
    if (this.readonly) return;

    const updatedNode = {
      ...node,
      position: {
        ...node.position,
        x: node.position.x + event.distance.x,
        y: node.position.y + event.distance.y
      }
    };

    this.formNodes.update(nodes =>
      nodes.map(n => n.id === node.id ? updatedNode : n)
    );

    this.markAsDirty();
  }

  // Utility methods
  getNodeIcon(nodeType: FlowNodeType): string {
    const iconMap: Record<FlowNodeType, string> = {
      input: 'input',
      logic: 'account_tree',
      validation: 'verified',
      output: 'output',
      section: 'view_module'
    };
    return iconMap[nodeType] || 'help';
  }

  trackByNodeId(index: number, node: FlowNode): string {
    return node.id;
  }

  trackByCategoryType(index: number, category: ComponentCategory): string {
    return category.type;
  }

  // Connection path generation for SVG
  getConnectionPath(connection: NodeConnection): string {
    const sourceNode = this.formNodes().find(n => n.id === connection.sourceNodeId);
    const targetNode = this.formNodes().find(n => n.id === connection.targetNodeId);

    if (!sourceNode || !targetNode) return '';

    // Calculate connection points
    const sourceX = sourceNode.position.x + (sourceNode.position.width || 180);
    const sourceY = sourceNode.position.y + (sourceNode.position.height || 100) / 2;
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + (targetNode.position.height || 100) / 2;

    // Create curved path
    const midX = (sourceX + targetX) / 2;
    const curve = Math.abs(targetX - sourceX) * 0.5;

    return `M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}`;
  }

  // Event handlers with proper typing
  onCheckboxChange(event: any, property: string): void {
    this.onNodePropertyChange(property, event.checked);
  }

  onInputBlur(event: any, property: string): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target) {
      this.onNodePropertyChange(property, target.value);
    }
  }
}
