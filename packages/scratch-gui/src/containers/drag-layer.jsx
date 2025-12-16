import {connect} from 'react-redux';
import DragLayer from '../components/drag-layer/drag-layer.jsx';

const mapStateToProps = state => ({
    dragging: state.scratchGui.assetDrag.dragging,
    currentOffset: state.scratchGui.assetDrag.currentOffset,
    img: state.scratchGui.assetDrag.img,
    dragType: state.scratchGui.assetDrag.dragType
});

export default connect(mapStateToProps)(DragLayer);
