/**
 *  **cxnSp (Connection Shape)**
 *  This element specifies a connection shape that is used to connect two sp elements.
 *  Once a connection is specified using a cxnSp, it is left to the generating application to determine the exact path the connector takes.
 *
 *  <xsd:complexType name="CT_Connector">
      <xsd:sequence>
        <xsd:element name="nvCxnSpPr" type="CT_ConnectorNonVisual" minOccurs="1" maxOccurs="1"/>
        <xsd:element name="spPr" type="a:CT_ShapeProperties" minOccurs="1" maxOccurs="1"/>
        <xsd:element name="style" type="a:CT_ShapeStyle" minOccurs="0" maxOccurs="1"/>
        <xsd:element name="extLst" type="CT_ExtensionListModify" minOccurs="0" maxOccurs="1"/>
      </xsd:sequence>
    </xsd:complexType>
    <xsd:complexType name="CT_ConnectorNonVisual">
      <xsd:sequence>
        <xsd:element name="cNvPr" type="a:CT_NonVisualDrawingProps" minOccurs="1" maxOccurs="1"/>
        <xsd:element name="cNvCxnSpPr" type="a:CT_NonVisualConnectorProperties" minOccurs="1" maxOccurs="1"/>
        <xsd:element name="nvPr" type="CT_ApplicationNonVisualDrawingProps" minOccurs="1" maxOccurs="1"/>
      </xsd:sequence>
    </xsd:complexType>
    <xsd:complexType name="CT_NonVisualConnectorProperties">
      <xsd:sequence>
        <xsd:element name="cxnSpLocks" type="CT_ConnectorLocking" minOccurs="0" maxOccurs="1"/>
        <xsd:element name="stCxn" type="CT_Connection" minOccurs="0" maxOccurs="1"/>
        <xsd:element name="endCxn" type="CT_Connection" minOccurs="0" maxOccurs="1"/>
        <xsd:element name="extLst" type="CT_OfficeArtExtensionList" minOccurs="0" maxOccurs="1"/>
      </xsd:sequence>
    </xsd:complexType>
    <xsd:complexType name="CT_Connection">
      <xsd:attribute name="id" type="ST_DrawingElementId" use="required"/>
      <xsd:attribute name="idx" type="xsd:unsignedInt" use="required"/>
    </xsd:complexType>
 */
import { genShape } from './p.sp.psr';

// TODO: Current only parses shape without connection
export default function cxnSpParser(node, context, nodeProps) {
  return genShape(node, context, nodeProps);
}
