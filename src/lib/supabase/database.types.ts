
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "bazaar_documents": {
                  Row: {
                    "bazaar_id": string,"created_at": string,"id": string,"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["document_status"],"storage_path": string | null,"type": Database["public"]['Enums']["bazaar_document_type"],"updated_at": string
                  }
                  Insert: {
                    "bazaar_id": string,"created_at"?: string,"id"?: string,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"storage_path"?: string | null,"type": Database["public"]['Enums']["bazaar_document_type"],"updated_at"?: string
                  }
                  Update: {
                    "bazaar_id"?: string,"created_at"?: string,"id"?: string,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"storage_path"?: string | null,"type"?: Database["public"]['Enums']["bazaar_document_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bazaar_documents_bazaar_id_fkey"
      columns: ["bazaar_id"]
isOneToOne: false
      referencedRelation: "bazaars"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bazaar_documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bazaar_photos": {
                  Row: {
                    "bazaar_id": string,"created_at": string,"id": string,"position": number,"storage_path": string
                  }
                  Insert: {
                    "bazaar_id": string,"created_at"?: string,"id"?: string,"position": number,"storage_path": string
                  }
                  Update: {
                    "bazaar_id"?: string,"created_at"?: string,"id"?: string,"position"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bazaar_photos_bazaar_id_fkey"
      columns: ["bazaar_id"]
isOneToOne: false
      referencedRelation: "bazaars"
      referencedColumns: ["id"]
    }
                  ]
                },"bazaar_profile_proposals": {
                  Row: {
                    "bazaar_id": string,"brands": (string)[],"created_at": string,"id": string,"link_url": string,"name": string,"photo_paths": (string)[],"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["proposal_status"],"submitted_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "bazaar_id": string,"brands": (string)[],"created_at"?: string,"id"?: string,"link_url": string,"name": string,"photo_paths"?: (string)[],"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["proposal_status"],"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bazaar_id"?: string,"brands"?: (string)[],"created_at"?: string,"id"?: string,"link_url"?: string,"name"?: string,"photo_paths"?: (string)[],"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["proposal_status"],"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bazaar_profile_proposals_bazaar_id_fkey"
      columns: ["bazaar_id"]
isOneToOne: false
      referencedRelation: "bazaars"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bazaar_profile_proposals_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bazaar_references": {
                  Row: {
                    "bazaar_id": string,"created_at": string,"full_name": string,"id": string,"phone": string,"position": number,"updated_at": string
                  }
                  Insert: {
                    "bazaar_id": string,"created_at"?: string,"full_name": string,"id"?: string,"phone": string,"position": number,"updated_at"?: string
                  }
                  Update: {
                    "bazaar_id"?: string,"created_at"?: string,"full_name"?: string,"id"?: string,"phone"?: string,"position"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bazaar_references_bazaar_id_fkey"
      columns: ["bazaar_id"]
isOneToOne: false
      referencedRelation: "bazaars"
      referencedColumns: ["id"]
    }
                  ]
                },"bazaars": {
                  Row: {
                    "brands": (string)[] | null,"created_at": string,"id": string,"link_url": string | null,"name": string | null,"profile_id": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"search_text": string,"status": Database["public"]['Enums']["bazaar_status"],"status_reason": string | null,"submitted_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "brands"?: (string)[] | null,"created_at"?: string,"id"?: string,"link_url"?: string | null,"name"?: string | null,"profile_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"search_text"?: string,"status"?: Database["public"]['Enums']["bazaar_status"],"status_reason"?: string | null,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "brands"?: (string)[] | null,"created_at"?: string,"id"?: string,"link_url"?: string | null,"name"?: string | null,"profile_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"search_text"?: string,"status"?: Database["public"]['Enums']["bazaar_status"],"status_reason"?: string | null,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bazaars_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bazaars_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "claim_failed_attempts": number,"code": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"full_name": string,"id": string,"profile_id": string | null,"shipping_address": string | null,"status": Database["public"]['Enums']["customer_status"],"type": Database["public"]['Enums']["customer_type"],"updated_at": string,"whatsapp": string | null
                  }
                  Insert: {
                    "claim_failed_attempts"?: number,"code"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"full_name": string,"id"?: string,"profile_id"?: string | null,"shipping_address"?: string | null,"status"?: Database["public"]['Enums']["customer_status"],"type": Database["public"]['Enums']["customer_type"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "claim_failed_attempts"?: number,"code"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"full_name"?: string,"id"?: string,"profile_id"?: string | null,"shipping_address"?: string | null,"status"?: Database["public"]['Enums']["customer_status"],"type"?: Database["public"]['Enums']["customer_type"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"channel": Database["public"]['Enums']["notification_channel"],"created_at": string,"created_by": string | null,"customer_id": string | null,"id": string,"kind": Database["public"]['Enums']["notification_kind"],"order_id": string | null,"package_id": string | null,"payment_id": string | null,"shipment_id": string | null
                  }
                  Insert: {
                    "body": string,"channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["notification_kind"],"order_id"?: string | null,"package_id"?: string | null,"payment_id"?: string | null,"shipment_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["notification_kind"],"order_id"?: string | null,"package_id"?: string | null,"payment_id"?: string | null,"shipment_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "order_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_shipment_id_fkey"
      columns: ["shipment_id"]
isOneToOne: false
      referencedRelation: "shipments"
      referencedColumns: ["id"]
    }
                  ]
                },"order_bazaars": {
                  Row: {
                    "bazaar_id": string | null,"bazaar_name": string | null,"id": string,"order_id": string
                  }
                  Insert: {
                    "bazaar_id"?: string | null,"bazaar_name"?: string | null,"id"?: string,"order_id": string
                  }
                  Update: {
                    "bazaar_id"?: string | null,"bazaar_name"?: string | null,"id"?: string,"order_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_bazaars_bazaar_id_fkey"
      columns: ["bazaar_id"]
isOneToOne: false
      referencedRelation: "bazaars"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_bazaars_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "order_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_bazaars_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_history": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"from_status": Database["public"]['Enums']["order_status"] | null,"id": string,"note": string | null,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"note"?: string | null,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: string,"note"?: string | null,"order_id"?: string,"to_status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_status_history_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "order_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_status_history_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_transitions": {
                  Row: {
                    "actor": string,"from_status": Database["public"]['Enums']["order_status"],"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Insert: {
                    "actor": string,"from_status": Database["public"]['Enums']["order_status"],"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "actor"?: string,"from_status"?: Database["public"]['Enums']["order_status"],"to_status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    
                  ]
                },"orders": {
                  Row: {
                    "cancelled_reason": string | null,"created_at": string,"created_by": string | null,"customer_id": string,"description": string,"expected_packages": number,"folio": number,"id": string,"status": Database["public"]['Enums']["order_status"],"updated_at": string
                  }
                  Insert: {
                    "cancelled_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"description": string,"expected_packages": number,"folio"?: never,"id"?: string,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string
                  }
                  Update: {
                    "cancelled_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"description"?: string,"expected_packages"?: number,"folio"?: never,"id"?: string,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"packages": {
                  Row: {
                    "bazaar_id": string | null,"bazaar_name": string | null,"created_at": string,"customer_id": string | null,"id": string,"note": string | null,"order_id": string | null,"photo_path": string,"received_at": string,"received_by": string | null,"updated_at": string
                  }
                  Insert: {
                    "bazaar_id"?: string | null,"bazaar_name"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"note"?: string | null,"order_id"?: string | null,"photo_path": string,"received_at"?: string,"received_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bazaar_id"?: string | null,"bazaar_name"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"note"?: string | null,"order_id"?: string | null,"photo_path"?: string,"received_at"?: string,"received_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "packages_bazaar_id_fkey"
      columns: ["bazaar_id"]
isOneToOne: false
      referencedRelation: "bazaars"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "packages_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "packages_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "order_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "packages_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "packages_received_by_fkey"
      columns: ["received_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"concept": Database["public"]['Enums']["payment_concept"],"created_at": string,"id": string,"method": Database["public"]['Enums']["payment_method"],"order_id": string,"proof_path": string | null,"recorded_by": string | null,"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  Insert: {
                    "amount_cents"?: number,"concept"?: Database["public"]['Enums']["payment_concept"],"created_at"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"order_id": string,"proof_path"?: string | null,"recorded_by"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"concept"?: Database["public"]['Enums']["payment_concept"],"created_at"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"order_id"?: string,"proof_path"?: string | null,"recorded_by"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "order_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"privacy_accepted_at": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"privacy_accepted_at"?: string | null,"role": Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"privacy_accepted_at"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "id": number,"initial_deposit_cents": number,"payment_instructions": string,"template_order_shipped": string,"template_package_received": string,"template_package_unassigned": string,"template_payment_confirmed": string,"template_payment_rejected": string,"updated_at": string
                  }
                  Insert: {
                    "id"?: number,"initial_deposit_cents": number,"payment_instructions": string,"template_order_shipped": string,"template_package_received": string,"template_package_unassigned": string,"template_payment_confirmed": string,"template_payment_rejected": string,"updated_at"?: string
                  }
                  Update: {
                    "id"?: number,"initial_deposit_cents"?: number,"payment_instructions"?: string,"template_order_shipped"?: string,"template_package_received"?: string,"template_package_unassigned"?: string,"template_payment_confirmed"?: string,"template_payment_rejected"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shipments": {
                  Row: {
                    "carrier": string | null,"cost_cents": number,"created_at": string,"created_by": string | null,"delivered_at": string | null,"id": string,"order_id": string,"shipped_at": string,"tracking_number": string | null,"type": Database["public"]['Enums']["shipment_type"],"updated_at": string
                  }
                  Insert: {
                    "carrier"?: string | null,"cost_cents"?: number,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"id"?: string,"order_id": string,"shipped_at"?: string,"tracking_number"?: string | null,"type": Database["public"]['Enums']["shipment_type"],"updated_at"?: string
                  }
                  Update: {
                    "carrier"?: string | null,"cost_cents"?: number,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string | null,"id"?: string,"order_id"?: string,"shipped_at"?: string,"tracking_number"?: string | null,"type"?: Database["public"]['Enums']["shipment_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shipments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "order_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shipments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"storage_trash": {
                  Row: {
                    "bazaar_id": string,"bucket_id": string,"created_at": string,"id": string,"path": string
                  }
                  Insert: {
                    "bazaar_id": string,"bucket_id": string,"created_at"?: string,"id"?: string,"path": string
                  }
                  Update: {
                    "bazaar_id"?: string,"bucket_id"?: string,"created_at"?: string,"id"?: string,"path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "storage_trash_bazaar_id_fkey"
      columns: ["bazaar_id"]
isOneToOne: false
      referencedRelation: "bazaars"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "order_summaries": {
                  Row: {
                    "cancelled_reason": string | null,"carrier": string | null,"created_at": string | null,"customer_code": string | null,"customer_has_account": boolean | null,"customer_id": string | null,"customer_name": string | null,"customer_type": Database["public"]['Enums']["customer_type"] | null,"delivered_at": string | null,"description": string | null,"expected_packages": number | null,"folio": number | null,"id": string | null,"last_payment_amount_cents": number | null,"last_payment_rejection_reason": string | null,"last_payment_status": Database["public"]['Enums']["payment_status"] | null,"received_packages": number | null,"shipment_cost_cents": number | null,"shipment_type": Database["public"]['Enums']["shipment_type"] | null,"shipped_at": string | null,"status": Database["public"]['Enums']["order_status"] | null,"tracking_number": string | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "apply_bazaar_proposal":
{ Args: { "proposal_id": string,"public_paths": (string)[] }; Returns: (string)[]
                           },
"approve_bazaar_document":
{ Args: { "document_id": string }; Returns: string
                           },
"can_edit_order":
{ Args: { "target": string }; Returns: boolean
                           },
"check_customer_claim":
{ Args: { "code"?: string,"whatsapp": string }; Returns: string
                           },
"create_order":
{ Args: { "bazaars": Json,"customer_id": string,"description": string,"expected_packages": number }; Returns: {
              "cancelled_reason": string | null,
"created_at": string,
"created_by": string | null,
"customer_id": string,
"description": string,
"expected_packages": number,
"folio": number,
"id": string,
"status": Database["public"]['Enums']["order_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"current_bazaar_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_bazaar_status":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["bazaar_status"]
                           },
"current_customer_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_customer_is_active":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"customer_claim_max_attempts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"find_customer":
{ Args: { "q": string }; Returns: {
              "active_orders": Json,"code": string,"exact_code": boolean,"full_name": string,"has_account": boolean,"id": string,"status": Database["public"]['Enums']["customer_status"],"type": Database["public"]['Enums']["customer_type"],"whatsapp": string
            }[]
                           },
"generate_customer_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_payment_info":
{ Args: Record<PropertyKey, never>; Returns: {
              "initial_deposit_cents": number,"payment_instructions": string
            }[]
                           },
"initial_deposit_cents":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"is_collector":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_privileged":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"order_has_bazaar":
{ Args: { "target": string }; Returns: boolean
                           },
"order_transition_allowed":
{ Args: { "actor": string,"from_status": Database["public"]['Enums']["order_status"],"to_status": Database["public"]['Enums']["order_status"] }; Returns: boolean
                           },
"paths_have_prefix":
{ Args: { "paths": (string)[],"prefix": string }; Returns: boolean
                           },
"promote_to_collector":
{ Args: { "email": string }; Returns: undefined
                           },
"reject_bazaar_document":
{ Args: { "document_id": string,"reason": string }; Returns: string
                           },
"search_directory":
{ Args: { "q"?: string }; Returns: {
              "brands": (string)[],"id": string,"link_url": string,"name": string,"photo_paths": (string)[]
            }[]
                           },
"update_order":
{ Args: { "bazaars": Json,"description": string,"expected_packages": number,"order_id": string }; Returns: {
              "cancelled_reason": string | null,
"created_at": string,
"created_by": string | null,
"customer_id": string,
"description": string,
"expected_packages": number,
"folio": number,
"id": string,
"status": Database["public"]['Enums']["order_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"valid_brands":
{ Args: { "brands": (string)[] }; Returns: boolean
                           }
          }
          Enums: {
            "bazaar_document_type": "id_card"|"selfie"|"proof_of_address"|"registration_payment","bazaar_status": "draft"|"pending_review"|"approved"|"rejected"|"suspended"|"deleted","customer_status": "active"|"deactivated"|"deleted","customer_type": "local"|"out_of_town","document_status": "pending"|"current"|"rejected","notification_channel": "whatsapp_link","notification_kind": "package_received"|"package_unassigned"|"payment_confirmed"|"payment_rejected"|"order_shipped","order_status": "registered"|"payment_pending"|"payment_confirmed"|"receiving"|"complete"|"shipped"|"delivered"|"cancelled","payment_concept": "initial_deposit","payment_method": "manual_transfer","payment_status": "pending"|"confirmed"|"rejected","proposal_status": "draft"|"pending"|"approved"|"rejected"|"discarded","shipment_type": "carrier"|"local_delivery"|"local_pickup","user_role": "collector"|"customer"|"bazaar"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "bazaar_document_type": ["id_card", "selfie", "proof_of_address", "registration_payment"],"bazaar_status": ["draft", "pending_review", "approved", "rejected", "suspended", "deleted"],"customer_status": ["active", "deactivated", "deleted"],"customer_type": ["local", "out_of_town"],"document_status": ["pending", "current", "rejected"],"notification_channel": ["whatsapp_link"],"notification_kind": ["package_received", "package_unassigned", "payment_confirmed", "payment_rejected", "order_shipped"],"order_status": ["registered", "payment_pending", "payment_confirmed", "receiving", "complete", "shipped", "delivered", "cancelled"],"payment_concept": ["initial_deposit"],"payment_method": ["manual_transfer"],"payment_status": ["pending", "confirmed", "rejected"],"proposal_status": ["draft", "pending", "approved", "rejected", "discarded"],"shipment_type": ["carrier", "local_delivery", "local_pickup"],"user_role": ["collector", "customer", "bazaar"]
          }
        }
} as const
