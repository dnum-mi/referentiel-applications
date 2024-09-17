/*
PostgreSQL Backup
Database: canel/public
Backup Time: 2023-12-20 11:31:05
*/
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP SEQUENCE IF EXISTS "public"."newtable_id_seq";
DROP TABLE IF EXISTS "public"."abs_tracability";
DROP TABLE IF EXISTS "public"."act_actor";
DROP TABLE IF EXISTS "public"."act_actorcode";
DROP TABLE IF EXISTS "public"."act_actorcodetype";
DROP TABLE IF EXISTS "public"."app_application";
DROP TABLE IF EXISTS "public"."app_applicationid";
DROP TABLE IF EXISTS "public"."app_compliance";
DROP TABLE IF EXISTS "public"."app_compliancetype";
DROP TABLE IF EXISTS "public"."app_flow";
DROP TABLE IF EXISTS "public"."app_flowdata";
DROP TABLE IF EXISTS "public"."app_flowperiod";
DROP TABLE IF EXISTS "public"."app_flowprotocol";
DROP TABLE IF EXISTS "public"."app_flowtype";
DROP TABLE IF EXISTS "public"."app_idtype";
DROP TABLE IF EXISTS "public"."app_instance";
DROP TABLE IF EXISTS "public"."app_instancerole";
DROP TABLE IF EXISTS "public"."app_instancestatus";
DROP TABLE IF EXISTS "public"."app_interface";
DROP TABLE IF EXISTS "public"."app_interfacetype";
DROP TABLE IF EXISTS "public"."app_status";
DROP TABLE IF EXISTS "public"."app_type";
DROP TABLE IF EXISTS "public"."env_environment";
DROP TABLE IF EXISTS "public"."fct_capability";
DROP TABLE IF EXISTS "public"."fct_capabilityrealisation";
DROP TABLE IF EXISTS "public"."fct_urbanzone";
DROP TABLE IF EXISTS "public"."fct_urbanzoneapplication";
DROP TABLE IF EXISTS "public"."fct_urbanzoneresponsability";
DROP TABLE IF EXISTS "public"."org_organisationunit";
DROP TABLE IF EXISTS "public"."org_roletype";
DROP TABLE IF EXISTS "public"."prj_applicationrole";
DROP TABLE IF EXISTS "public"."prj_project";
DROP TABLE IF EXISTS "public"."prj_projectapplication";
DROP TABLE IF EXISTS "public"."prj_projectresponsability";
DROP TABLE IF EXISTS "public"."ptf_portfolio";
DROP TABLE IF EXISTS "public"."ptf_portfolioapplication";
DROP TABLE IF EXISTS "public"."ptf_portfolioresponsability";
DROP TABLE IF EXISTS "public"."ref_sensitivity";
DROP TABLE IF EXISTS "public"."resources";
DROP TABLE IF EXISTS "public"."roles";
DROP FUNCTION IF EXISTS "public"."uuid_generate_v1()";
DROP FUNCTION IF EXISTS "public"."uuid_generate_v1mc()";
DROP FUNCTION IF EXISTS "public"."uuid_generate_v3(namespace uuid, name text)";
DROP FUNCTION IF EXISTS "public"."uuid_generate_v4()";
DROP FUNCTION IF EXISTS "public"."uuid_generate_v5(namespace uuid, name text)";
DROP FUNCTION IF EXISTS "public"."uuid_nil()";
DROP FUNCTION IF EXISTS "public"."uuid_ns_dns()";
DROP FUNCTION IF EXISTS "public"."uuid_ns_oid()";
DROP FUNCTION IF EXISTS "public"."uuid_ns_url()";
DROP FUNCTION IF EXISTS "public"."uuid_ns_x500()";
DROP TYPE IF EXISTS "public"."app_compliance_level";
DROP TYPE IF EXISTS "public"."app_data_flow_orient";
DROP TYPE IF EXISTS "public"."app_flow_status";
DROP TYPE IF EXISTS "public"."env_protection";
DROP TYPE IF EXISTS "public"."env_status";
DROP TYPE IF EXISTS "public"."env_type";
DROP TYPE IF EXISTS "public"."prj_app_type";
CREATE SEQUENCE "newtable_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
CREATE TYPE "app_compliance_level" AS ENUM (
  'Dispensée',
  'Non passée',
  'Partielle',
  'Complète',
  'Obsolète'
);
ALTER TYPE "app_compliance_level" OWNER TO "postgres";
CREATE TYPE "app_data_flow_orient" AS ENUM (
  'push',
  'pull',
  'bi-directional'
);
ALTER TYPE "app_data_flow_orient" OWNER TO "postgres";
CREATE TYPE "app_flow_status" AS ENUM (
  'actif',
  'inactif'
);
ALTER TYPE "app_flow_status" OWNER TO "postgres";
CREATE TYPE "env_protection" AS ENUM (
  'NP',
  'DR',
  'Secret',
  'Très secret'
);
ALTER TYPE "env_protection" OWNER TO "postgres";
CREATE TYPE "env_status" AS ENUM (
  'En construction',
  'Actif',
  'Inactif'
);
ALTER TYPE "env_status" OWNER TO "postgres";
CREATE TYPE "env_type" AS ENUM (
  'CaaS',
  'IaaS',
  'VM',
  'BarMetal'
);
ALTER TYPE "env_type" OWNER TO "postgres";
CREATE TYPE "prj_app_type" AS ENUM (
  'Contributing',
  'Managed'
);
ALTER TYPE "prj_app_type" OWNER TO "postgres";
CREATE TABLE "abs_tracability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
;
ALTER TABLE "abs_tracability" OWNER TO "postgres";
CREATE TABLE "act_actor" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL DEFAULT now(),
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL DEFAULT now(),
  "comments" text COLLATE "pg_catalog"."default",
  "actorid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "organisationunitid" uuid,
  "validationdate" date NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "act_actor" OWNER TO "postgres";
CREATE TABLE "act_actorcode" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "actorid" uuid NOT NULL,
  "actorcodetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "actorcode" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "act_actorcode" OWNER TO "postgres";
CREATE TABLE "act_actorcodetype" (
  "actorcodetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "act_actorcodetype" OWNER TO "postgres";
CREATE TABLE "app_application" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL DEFAULT now(),
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL DEFAULT now(),
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "longname" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "status" char(3) COLLATE "pg_catalog"."default" NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "sensitivity" char(2) COLLATE "pg_catalog"."default" NOT NULL,
  "apptype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_application" OWNER TO "postgres";
CREATE TABLE "app_applicationid" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "applicationidtypecode" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "shortcode" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "longcode" varchar(200) COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_applicationid" OWNER TO "postgres";
CREATE TABLE "app_compliance" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "compliancetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "compliancelevel" "public"."app_compliance_level" NOT NULL DEFAULT 'Non passée'::app_compliance_level,
  "decisiondate" date,
  "validitydate" date,
  "auditdate" date,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_compliance" OWNER TO "postgres";
CREATE TABLE "app_compliancetype" (
  "compliancetype" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "referenceurl" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "app_compliancetype" OWNER TO "postgres";
CREATE TABLE "app_flow" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "flowid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "applicationsourceid" uuid,
  "organisationunitsourceid" uuid,
  "applicationtargetid" uuid,
  "organisationunittargetid" uuid,
  "middleware" text COLLATE "pg_catalog"."default",
  "flowtypeid" varchar(5) COLLATE "pg_catalog"."default",
  "flowprotocolid" varchar(5) COLLATE "pg_catalog"."default",
  "flowperiodid" varchar(5) COLLATE "pg_catalog"."default",
  "flowdataorientation" "public"."app_data_flow_orient" NOT NULL,
  "ports" varchar(200) COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_flow" OWNER TO "postgres";
CREATE TABLE "app_flowdata" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "flowid" uuid NOT NULL,
  "dataid" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "datadescription" text COLLATE "pg_catalog"."default",
  "dataurl" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_flowdata" OWNER TO "postgres";
CREATE TABLE "app_flowperiod" (
  "flowperiodid" varchar(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "app_flowperiod" OWNER TO "postgres";
CREATE TABLE "app_flowprotocol" (
  "flowprotocolid" varchar(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_flowprotocol" OWNER TO "postgres";
CREATE TABLE "app_flowtype" (
  "flowtypeid" varchar(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_flowtype" OWNER TO "postgres";
CREATE TABLE "app_idtype" (
  "applicationidtypecode" char(6) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_idtype" OWNER TO "postgres";
CREATE TABLE "app_instance" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "environmentid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "instancerole" char(1) COLLATE "pg_catalog"."default" DEFAULT 'E'::bpchar,
  "instancestatus" char(3) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'PRD'::bpchar,
  "tenant" text COLLATE "pg_catalog"."default",
  "fip" text COLLATE "pg_catalog"."default",
  "url" text COLLATE "pg_catalog"."default",
  "deploymentdate" date,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_instance" OWNER TO "postgres";
CREATE TABLE "app_instancerole" (
  "instancerole" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "label" text COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_instancerole" OWNER TO "postgres";
CREATE TABLE "app_instancestatus" (
  "instancestatus" char(3) COLLATE "pg_catalog"."default" NOT NULL,
  "label" text COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_instancestatus" OWNER TO "postgres";
CREATE TABLE "app_interface" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "interfaceid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "interfacetypeid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "applicationdatasource" uuid,
  "applicationdistribution" uuid,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "app_interface" OWNER TO "postgres";
CREATE TABLE "app_interfacetype" (
  "interfacetypeid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "app_interfacetype" OWNER TO "postgres";
CREATE TABLE "app_status" (
  "applicationstatuscode" char(3) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_status" OWNER TO "postgres";
CREATE TABLE "app_type" (
  "applicationtypecode" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "app_type" OWNER TO "postgres";
CREATE TABLE "env_environment" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "environmentid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "organisation" text COLLATE "pg_catalog"."default" NOT NULL,
  "environmenttype" "public"."env_type" NOT NULL DEFAULT 'CaaS'::env_type,
  "environmentprotection" "public"."env_protection" NOT NULL DEFAULT 'NP'::env_protection,
  "environmentstatus" "public"."env_status" NOT NULL DEFAULT 'Actif'::env_status,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "env_environment" OWNER TO "postgres";
CREATE TABLE "fct_capability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "capabilityid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_capability" OWNER TO "postgres";
CREATE TABLE "fct_capabilityrealisation" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "capabilityid" uuid NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_capabilityrealisation" OWNER TO "postgres";
CREATE TABLE "fct_urbanzone" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "urbanzoneid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_urbanzone" OWNER TO "postgres";
CREATE TABLE "fct_urbanzoneapplication" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "urbanzoneid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_urbanzoneapplication" OWNER TO "postgres";
CREATE TABLE "fct_urbanzoneresponsability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "urbanzoneid" uuid NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "fct_urbanzoneresponsability" OWNER TO "postgres";
CREATE TABLE "org_organisationunit" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "organisationunitid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parentid" uuid,
  "organisationcode" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "org_organisationunit" OWNER TO "postgres";
CREATE TABLE "org_roletype" (
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "org_roletype" OWNER TO "postgres";
CREATE TABLE "prj_applicationrole" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL DEFAULT now(),
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL DEFAULT now(),
  "comments" text COLLATE "pg_catalog"."default",
  "applicationid" uuid NOT NULL,
  "actorid" uuid,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "validationdate" date NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_applicationrole" OWNER TO "postgres";
CREATE TABLE "prj_project" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "projectid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "parentid" uuid,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_project" OWNER TO "postgres";
CREATE TABLE "prj_projectapplication" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "projectid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "applicationrole" "public"."prj_app_type" NOT NULL DEFAULT 'Managed'::prj_app_type,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_projectapplication" OWNER TO "postgres";
CREATE TABLE "prj_projectresponsability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "projectid" uuid NOT NULL,
  "actorid" uuid NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "prj_projectresponsability" OWNER TO "postgres";
CREATE TABLE "ptf_portfolio" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "portfolioid" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "label" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "parentid" uuid,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "ptf_portfolio" OWNER TO "postgres";
CREATE TABLE "ptf_portfolioapplication" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "portfolioid" uuid NOT NULL,
  "applicationid" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "ptf_portfolioapplication" OWNER TO "postgres";
CREATE TABLE "ptf_portfolioresponsability" (
  "createdby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "createdat" timestamp(3) NOT NULL,
  "updatedby" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "updatedat" timestamp(3) NOT NULL,
  "comments" text COLLATE "pg_catalog"."default",
  "portfolioid" uuid NOT NULL,
  "actorid" uuid NOT NULL,
  "organisationunitid" uuid NOT NULL,
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "desription" text COLLATE "pg_catalog"."default",
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()
)
INHERITS ("public"."abs_tracability")
;
ALTER TABLE "ptf_portfolioresponsability" OWNER TO "postgres";
CREATE TABLE "ref_sensitivity" (
  "sensitivitycode" char(2) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(200) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "ref_sensitivity" OWNER TO "postgres";
CREATE TABLE "resources" (
  "id" int4 NOT NULL DEFAULT nextval('newtable_id_seq'::regclass),
  "resource" varchar COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "resources" OWNER TO "postgres";
CREATE TABLE "roles" (
  "roleid" char(5) COLLATE "pg_catalog"."default" NOT NULL,
  "resourceid" int4 NOT NULL,
  "create_all" bool NOT NULL DEFAULT false,
  "create_own" bool NOT NULL DEFAULT false,
  "read_all" bool NOT NULL DEFAULT false,
  "read_own" bool NOT NULL DEFAULT false,
  "update_all" bool NOT NULL DEFAULT false,
  "update_own" bool NOT NULL DEFAULT false,
  "delete_all" bool NOT NULL DEFAULT false,
  "delete_own" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "roles" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v1"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v1'
  LANGUAGE c VOLATILE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v1"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v1mc"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v1mc'
  LANGUAGE c VOLATILE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v1mc"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v3"("namespace" uuid, "name" text)
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v3'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v3"("namespace" uuid, "name" text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v4"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v4'
  LANGUAGE c VOLATILE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v4"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_generate_v5"("namespace" uuid, "name" text)
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_generate_v5'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_generate_v5"("namespace" uuid, "name" text) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_nil"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_nil'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_nil"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_dns"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_dns'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_dns"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_oid"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_oid'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_oid"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_url"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_url'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_url"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "uuid_ns_x500"()
  RETURNS "pg_catalog"."uuid" AS '$libdir/uuid-ossp', 'uuid_ns_x500'
  LANGUAGE c IMMUTABLE STRICT
  COST 1;
ALTER FUNCTION "uuid_ns_x500"() OWNER TO "postgres";
BEGIN;
LOCK TABLE "public"."abs_tracability" IN SHARE MODE;
DELETE FROM "public"."abs_tracability";
INSERT INTO "public"."abs_tracability" ("createdby","createdat","updatedby","updatedat","comments","id") VALUES ('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'a9ae9884-e427-46a9-9e34-953a81f005a2'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '1a4bda07-8eba-42d7-86ed-7510af4e9499'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'e6da56e5-3bc9-4829-b983-8966d007fa5e'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '456b415d-6eef-4b28-8ff0-6b3ca0f0be92'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '7125b5d5-fb1c-4bf6-b923-077458f46be4'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'f6d811ff-8f40-417c-a183-03933f62189b'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'acbfbdad-49f5-45b5-8cff-ebe5456e69ea'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'bb1066cd-964a-4136-acbb-02e56a0ff79c'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '421b8257-19f3-4955-bb70-25d9f8baa8a4'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'fd7dc516-a76c-4f9c-acce-0d4a5c2fba85'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '78b6248a-542f-4167-9ca4-1405ec6d0705'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'b954b2df-4dd3-408d-bbef-dc0fe3291ea6'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'a4ab51eb-6365-495c-b6b9-f3840bbf222a'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '946610ea-7b57-4013-99fd-6f57e842415b'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'd16068be-f388-4159-9f1e-67407b6c6a3e'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '7deed2f1-9631-4f15-9afe-ebced02cd374'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '6aa1867f-728a-43a0-a26f-d8dc2ba2261b'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'c87012ea-fdd8-474b-8a20-91cd4910d38b'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '88810669-8e46-4c26-9071-5b8c3f9a1596'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'f3fa8d9e-e60a-4166-89ab-f5275e3fa362'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '73b0bb88-8616-47db-943e-318e821ce3af'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'b9b4f22e-9e3b-4781-8a13-3e3bf91374c6'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '42cd05b1-57c8-4789-a5cb-f958f4bf338c'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ac758e06-793f-4d9c-af1e-96974ef39c5f'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '001e0efa-b2ef-486b-ac56-253520db8e25'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '1faadc79-58bf-4784-9ec1-c898d1e3c0ef'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '5edebada-9948-4dde-82bb-69c24c26bc8d'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '29156e77-92fe-439a-9fc9-a708458753f3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '1bc7a521-115e-48c4-88a1-719ee4ac759a'),('string', '2023-11-07 08:50:42.331', 'Swagger', '2023-11-07 08:50:42.331', NULL, 'b26ac473-4512-417e-9cd9-6331271c90f8'),('Testing', '2023-11-07 13:00:31.955', 'Testing', '2023-11-07 13:00:31.955', NULL, '03f66ea4-4570-4f3e-acfe-74bae8d8b26a'),('Testing', '2023-11-07 13:00:31.961', 'Testing', '2023-11-07 13:00:31.961', NULL, '44e4bc1b-6ab6-43e6-8c52-d2127585bfb2'),('Swagger', '2023-11-07 13:00:32.106', 'Swagger', '2023-11-07 13:00:32.106', NULL, 'fe36eba8-a288-42f3-b0ec-70e45871e14b'),('Testing', '2023-11-07 13:00:32.135', 'Swagger', '2023-11-07 13:00:32.135', NULL, '0eea0011-d93a-450f-b561-b2241bec5924'),('Testing', '2023-11-07 13:16:47.415', 'Testing', '2023-11-07 13:16:47.415', NULL, '4eb7e05e-9ce5-4efc-93bf-3bf69583840c'),('Testing', '2023-11-07 13:16:47.42', 'Testing', '2023-11-07 13:16:47.42', NULL, 'd2d86a63-ab2a-4517-9a72-904b2ae8b2b5'),('Swagger', '2023-11-07 13:16:48.288', 'Swagger', '2023-11-07 13:16:48.288', NULL, '6ca09a50-ddf2-4201-bb3d-144121b67743'),('Testing', '2023-11-07 13:16:48.311', 'Swagger', '2023-11-07 13:16:48.311', NULL, 'd2eca294-d3dc-409b-abf5-33ddf5a28ebd'),('Swagger', '2023-11-07 13:18:05.669', 'Swagger', '2023-11-07 13:18:05.669', NULL, '6116fca7-9b77-4cf2-a9da-4bfcbde4c2c3'),('Testing', '2023-11-07 13:18:05.697', 'Swagger', '2023-11-07 13:18:05.697', NULL, '18df86a9-d2c9-4314-9e0d-f36793ef4452'),('Testing', '2023-11-07 13:18:06.549', 'Testing', '2023-11-07 13:18:06.549', NULL, 'cd2323ed-3cec-422d-afb3-000a4ba5168e'),('Testing', '2023-11-07 13:18:06.554', 'Testing', '2023-11-07 13:18:06.554', NULL, 'de3ad76a-5502-4f98-8b86-d95a639053fd'),('Swagger', '2023-11-14 08:15:16.206', 'Swagger', '2023-11-14 08:15:16.206', NULL, 'e932671f-441d-420c-bca2-5ea71ce6341b'),('DSO', '2023-11-14 08:33:55.841', 'DSO', '2023-11-14 08:33:55.841', NULL, '972d9d51-a1ce-4c02-89ca-1fd845b8d848'),('Swagger', '2023-11-14 10:38:05.273', 'Swagger', '2023-11-14 10:38:05.273', NULL, '4c6a026f-c077-4595-92f1-15e1eae81f3a'),('Testing', '2023-11-14 10:38:05.297', 'Swagger', '2023-11-14 10:38:05.297', NULL, '07ebde3e-3ed0-4605-b9ef-0ef5f4cd8ded'),('Testing', '2023-11-14 10:38:05.412', 'Testing', '2023-11-14 10:38:05.412', NULL, '01a970f7-0076-44e2-a151-a4214d0c939b'),('Testing', '2023-11-14 10:38:05.425', 'Testing', '2023-11-14 10:38:05.425', NULL, '20e8ce1d-530a-4b87-8715-592f26f4da44'),('Testing', '2023-11-14 10:41:19.489', 'Testing', '2023-11-14 10:41:19.489', NULL, '58dd317d-7ac8-416d-bff2-df8350ff343a'),('Testing', '2023-11-14 10:41:19.496', 'Testing', '2023-11-14 10:41:19.496', NULL, '8600a935-8765-402a-9431-d403e82ed66b'),('Swagger', '2023-11-14 10:41:19.824', 'Swagger', '2023-11-14 10:41:19.824', NULL, '675014e1-0245-47e1-a8a1-aae85cb06856'),('Testing', '2023-11-14 10:41:19.857', 'Swagger', '2023-11-14 10:41:19.857', NULL, '1cbbba73-fdc8-4f75-b75b-6c171ee18c4d'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '5066787d-ab54-4e97-bb8a-5963b8f2ac8c'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'd564525b-8211-4e43-b855-fae77b54ce57'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '4409daa9-4d89-4503-a07b-7067e5f320f3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '4f944b59-3880-4d2b-9409-0a63c3dc5a58'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'fc1be1db-9441-4c43-8a51-321f86b52976'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'b5fa017c-1d6c-4c86-8ee7-05f4bf7991e5'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '37819ed8-fa1c-41a0-9871-a47f13caedc8'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ad5b10dc-ac0d-433a-a5ee-0d5bdf76a16f'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '185b7e89-eb0e-4354-aacc-c832a3bea9ce'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '134a2297-56ed-4b41-9369-a1f576fafdd8'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '24768663-0fd8-4bce-b010-8b38e2be305d'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '23379345-6f09-4ae9-806b-b7c86e37e749'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '8359e094-d961-4d57-9559-aa2b94e3daf8'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '0a2905f2-7e62-47d2-81a9-4631ef3d944a'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'cd26b13a-e6fb-49d4-a69e-c8fd25fdb0fa'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ced601a0-3208-4cd4-b17e-a1cdc0b0fdeb'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'd1674336-a32c-4c1f-b6a5-34a40a001b3d'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '77d0dd5f-3134-4bcf-870b-fce367aca388'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'e95f4168-c940-4cbb-b8bc-0ce85d8609ec'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '11e651dc-22b4-4d92-a7bb-7eba9a4eb5a3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'f548778c-92b3-4ce4-a35c-de7bfb4976df'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '1c5f66cc-3750-407e-8927-c62b00b39b4e'),('Tests Authentification Canel', '2023-12-20 11:24:56.502', 'Tests Authentification Canel', '2023-12-20 11:24:56.502', NULL, '8f2f19a5-f412-415f-bcf3-f7dbc0c6f8aa'),('Tests Authentification Canel', '2023-12-20 11:24:56.526', 'Tests Authentification Canel', '2023-12-20 11:24:56.526', NULL, '2cc51290-0862-4626-84a3-934fd0910f73'),('Tests Authentification Canel', '2023-12-20 11:24:56.53', 'Tests Authentification Canel', '2023-12-20 11:24:56.53', NULL, 'da069066-4318-499b-876a-20a482a4b538'),('Tests Authentification Canel', '2023-12-20 11:25:10.397', 'Tests Authentification Canel', '2023-12-20 11:25:10.397', NULL, '6929f789-5d74-4be0-850f-434d1df9effe'),('Tests Authentification Canel', '2023-12-20 11:25:10.401', 'Tests Authentification Canel', '2023-12-20 11:25:10.401', NULL, 'a33f6ecd-d546-4732-b7e5-8d3f0627565b'),('Tests Authentification Canel', '2023-12-20 11:25:10.405', 'Tests Authentification Canel', '2023-12-20 11:25:10.405', NULL, 'ec5a6716-2e12-489b-8598-4fe987a3b6e9'),('Tests Authentification Canel', '2023-12-20 11:25:25.871', 'Tests Authentification Canel', '2023-12-20 11:25:25.871', NULL, '20a52ad5-8263-48e1-b07a-c6f52c5fd826'),('Tests Authentification Canel', '2023-12-20 11:25:25.875', 'Tests Authentification Canel', '2023-12-20 11:25:25.875', NULL, '952fc721-56f8-4b0c-96c4-a00db0495b07'),('Tests Authentification Canel', '2023-12-20 11:25:25.878', 'Tests Authentification Canel', '2023-12-20 11:25:25.878', NULL, 'c41cac8d-7a28-41a3-820a-62a752515454'),('Tests Authentification Canel', '2023-12-20 11:25:36.432', 'Tests Authentification Canel', '2023-12-20 11:25:36.432', NULL, '67337805-dd43-4a8b-924a-137e3fa2df0c'),('Tests Authentification Canel', '2023-12-20 11:25:36.436', 'Tests Authentification Canel', '2023-12-20 11:25:36.436', NULL, '0afb35dd-3c9b-40bb-a84d-41d003fe7d3b'),('Tests Authentification Canel', '2023-12-20 11:25:36.439', 'Tests Authentification Canel', '2023-12-20 11:25:36.439', NULL, '438a315e-0e97-447d-bc99-374c89ac72d1'),('Tests Authentification Canel', '2023-12-20 11:25:36.442', 'Tests Authentification Canel', '2023-12-20 11:25:36.442', NULL, '16c3a8a5-a967-44b6-a5f2-978a72bca847'),('Tests Authentification Canel', '2023-12-20 11:25:48.658', 'Tests Authentification Canel', '2023-12-20 11:25:48.658', NULL, '26ed5913-af65-431e-b15e-d9529f33835c'),('Tests Authentification Canel', '2023-12-20 11:25:48.662', 'Tests Authentification Canel', '2023-12-20 11:25:48.662', NULL, '6943bba8-854e-452e-9c65-e2e4d0695a56'),('Tests Authentification Canel', '2023-12-20 11:25:48.665', 'Tests Authentification Canel', '2023-12-20 11:25:48.665', NULL, '78b8872d-8995-44f7-a529-84ee8dc626b6'),('Tests Authentification Canel', '2023-12-20 11:25:48.668', 'Tests Authentification Canel', '2023-12-20 11:25:48.668', NULL, '1589f534-ff3b-464e-b5a1-8cb90bbcc67c'),('Tests Authentification Canel', '2023-12-20 11:26:01.964', 'Tests Authentification Canel', '2023-12-20 11:26:01.964', NULL, 'bb539232-1292-405d-ad9d-fbab10b01218'),('Tests Authentification Canel', '2023-12-20 11:26:01.968', 'Tests Authentification Canel', '2023-12-20 11:26:01.968', NULL, '37c74303-a5be-40b1-bce8-f7899fabce7b'),('Tests Authentification Canel', '2023-12-20 11:26:01.971', 'Tests Authentification Canel', '2023-12-20 11:26:01.971', NULL, '3403e8aa-d1ca-44eb-b769-20d4aabe7112'),('Tests Authentification Canel', '2023-12-20 11:26:01.974', 'Tests Authentification Canel', '2023-12-20 11:26:01.974', NULL, '9fd815a3-73ba-4f07-bd4e-84f0cc8a6d37'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '4a3fa9ed-d1a0-4689-9cfc-49a1c947414a'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '5946552c-2612-4e9b-9c98-1ca005f85d4b'),('Tests Authentification Canel', '2023-12-20 11:25:36.446', 'Tests Authentification Canel', '2023-12-20 11:25:36.446', NULL, '4226971e-86f7-4f60-b1df-df3c01206ead'),('Reprise Data 20231130', '2023-12-20 11:25:36.45', 'Reprise Data 20231130', '2023-12-20 11:25:36.45', NULL, '684fb6b2-6a1f-4d58-bbe9-2550775581f9'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Dépôts pièces justificatives (CERT)', '33ea7460-95d1-45bf-b374-2f234495b5a6'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Interrogation véhicule SIV', '89fc4355-c317-410c-adc7-9120dec5970f'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Capture information CIV pour feuille index', '9ee41b88-c532-4eb9-9db4-d6a7e5dab43b'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '688443fc-f646-4000-ab40-e3aeae8e67d9'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '61f23054-4fca-49dc-bfb8-2c7243c3d76a'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '908eef0f-b043-4fec-8700-7d05ea5678b3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'eb5f43ed-e096-48c0-9c4d-83268949fb92'),('DSO', '2023-11-16 07:02:32.077', 'DSO', '2023-11-16 07:02:32.077', NULL, '73c7151d-f938-4cbf-88f2-9b6082d03a0d'),('Swagger', '2023-11-10 07:50:45.665', 'Swagger', '2023-11-10 07:50:45.665', NULL, '7bfacd27-e7af-41c9-a40f-de675dff2415')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."act_actor" IN SHARE MODE;
DELETE FROM "public"."act_actor";
INSERT INTO "public"."act_actor" ("createdby","createdat","updatedby","updatedat","comments","actorid","name","email","organisationunitid","validationdate","id") VALUES ('Tests Authentification Canel', '2023-12-20 11:25:36.446', 'Tests Authentification Canel', '2023-12-20 11:25:36.446', NULL, '94323248-8e64-44ff-9977-fa090ca95a22', 'TESTAUTH 001', 'testauth001.canel@interieur.gouv.fr', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', '2025-01-23', '4226971e-86f7-4f60-b1df-df3c01206ead')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."act_actorcode" IN SHARE MODE;
DELETE FROM "public"."act_actorcode";
COMMIT;
BEGIN;
LOCK TABLE "public"."act_actorcodetype" IN SHARE MODE;
DELETE FROM "public"."act_actorcodetype";
INSERT INTO "public"."act_actorcodetype" ("actorcodetype","label") VALUES ('RIO  ', 'Référentiel des acteurs MIOM')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_application" IN SHARE MODE;
DELETE FROM "public"."app_application";
INSERT INTO "public"."app_application" ("createdby","createdat","updatedby","updatedat","comments","applicationid","parentid","longname","description","status","organisationunitid","sensitivity","apptype","id") VALUES ('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '2a39cad5-0fc7-45b5-918d-a7702eba1154', NULL, 'SIV', 'SIV, Système d’Immatriculation des Véhicules, Il assure le suivi de toutes les informations concernant les pièces administratives exigées pour la circulation des véhicules ou affectant la disponibilité de ceux-ci. Gérer les pièces administratives du droit de circuler des véhicules sur les voies ouvertes à la circulation publique.<br>- Données d''identification des professionnels habilités dans le cadre du système d''immatriculation des véhicules.Le Système d’immatriculation des véhicules (SIV) contient les données concernant les titres liés aux véhicules (historique de chaque véhicule, caractéristiques techniques, situation administrative, informations sur Titulaire/ Co-Titulaire/ Locataire/ Loueur/ Créancier/Acquéreur/Broyeur). Le système contient 11 schémas : SIV, IVT, APD, SIT, SVV, SVJ, IVJ, IVH, IE IVI_CONF, IE IVI_SUIVI. MOE : ANTS.<br>- Données d''identification du titulaire du certificat d''immatriculation du véhicule.<br>- Adresse du titulaire du certificat d''immatriculation du véhicule .<br>- Données relatives au véhicule et à l''autorisation de circuler du véhicule. (gérer le système d''immatriculation caractérisé par l''attribution à vie d''un numéro à un véhicule, quel qu''en soit le titulaire)<br><br>Le Système d’immatriculation des véhicules (SIV) contient les données concernant les titres liés aux véhicules (historique de chaque véhicule, caractéristiques techniques, situation administrative, informations sur Titulaire/ Co-Titulaire/ Locataire/ Loueur/ Créancier/Acquéreur/Broyeur).<br><br>Le système contient 11 schémas : SIV, IVT, APD, SIT, SVV, SVJ, IVJ, IVH, IE IVI_CONF, IE IVI_SUIVI.<br><br>MOE : ANTS.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '5066787d-ab54-4e97-bb8a-5963b8f2ac8c'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'febeaf2d-20f7-4fb1-9d62-77234bf73fca', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIV Coeur', 'Coeur du Système d''Imatriculation de Véhicule<br>Module cœur de l''application SIV. Il prend en charge les interactions avec les CERT et avec les derniers guichets en préfectures (conservés pour les demandes très particulières). Il fonctionne en parallèle avec le module ''SIV PPNG'' mis en service en 2017 lors de la mise en œuvre du Programme Préfecture Nouvelle Génération.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', 'd564525b-8211-4e43-b855-fae77b54ce57'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'f82982ed-f2f7-479d-b7a1-77dec319c0dd', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIV PPNG', 'SIV - Extension PPNG 2017<br>SIV PPNG est le module applicatif mettant en œuvre les téléservices usager du programme préfectures nouvelle génération (PPNG) de 2017.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '4409daa9-4d89-4503-a07b-7067e5f320f3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '7c12670e-eaeb-48c3-9918-68d519c58e19', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'Dépot NAS', 'SIV - Dépôt pour pièces justificatives', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '4f944b59-3880-4d2b-9409-0a63c3dc5a58'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '867924e4-5ace-49c5-8e51-0b97e7580247', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIV Journalisation', 'Journalisation fonctionnelle pour SIV coeur et PPNG', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', 'fc1be1db-9441-4c43-8a51-321f86b52976'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'cfc56ebb-e899-4c47-8275-fd8658a441ab', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'MASCADIA', 'Mise des adresses à la norme AFNOR<br>Ce composant correspond à une application à part entière fournie par La Poste. L’ensemble des services de vérification et de validation de cette application sont packagés sous forme d’un webservice optimisé pour supporter une forte volumétrie.<br>Les interfaces sont les suivantes :<br>- contrôle de l’adresse fournie par rapport à la norme AFNOR<br>- transformation d’une adresse au format selon la norme AFNOR', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', 'b5fa017c-1d6c-4c86-8ee7-05f4bf7991e5'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '60dae0f2-063e-43e9-9dfb-03d3582617fe', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SATVV', 'Base Satellite des Véhicules Volés<br><br>Extrait de l''arrêté du 10 décembre 2008 (consolidé le 2 juillet 2018).<br>Base satellite VV a pour finalités d''accéder aux informations relatives à l’état de vol et de mise sous surveillance d’un véhicule afin :<br>- d’informer les agents des autorités administratives mentionnées au troisième alinéa de l’article 3, pour les besoins exclusifs de leurs missions, de l’état de vol d’un véhicule ;<br>- d’informer les services de police et de gendarmerie nationales compétents de la nature des opérations d’immatriculation effectuées sur un véhicule surveillé.<br><br>Dans le cadre des finalités prévues à l’article 1er, le présent traitement peut faire l’objet d’interconnexion, mise en relation ou rapprochement avec :<br>- le système d’immatriculation des véhicules (SIV) ;<br>- le fichier des véhicules volés (FVV) ;<br>- le système de contrôle automatisé (CSA) ;<br>- le système d’information Schengen (SIS).<br><br>Les catégories de données enregistrées dans le traitement sont les suivantes :<br>- caractéristiques permettant l’identification du véhicule (numéro d’immatriculation, numéro diplomatique, numéro VIN, marque) ;<br>- état et date de vol du véhicule, code du service à l’origine de cet état, le cas échéant, la date de découverte du véhicule ainsi que le code du service à l’origine de la découverte ;<br>- état et date de mise sous surveillance d’un véhicule, code du service à l’origine de cet état, la nature, la date, l’heure de l’opération effectuée sur le véhicule surveillé ainsi que le code partenaire ou le code préfecture de l’opération', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '37819ed8-fa1c-41a0-9871-a47f13caedc8'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '9553a24a-26e9-4082-b872-1932faadbe28', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIV Client TESA', 'Prise en charge des terminaux embarqués de la police et de la gendarmerie.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', 'ad5b10dc-ac0d-433a-a5ee-0d5bdf76a16f'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '24c0c394-509b-4a8b-b529-fd1d42b970a4', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'DCVI', 'Dispositif de Contrôle de Validité des Immatriculations (DCVI) : service sur mesure pour les forces de l’ordre leur permettant de consulter les données du Système d’Immatriculation des Véhicules (SIV) quand celui-ci n’est pas opérationnel (maintenance programmée ou panne).', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '185b7e89-eb0e-4354-aacc-c832a3bea9ce'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '1baa6df3-74d5-4fd8-9c31-a3d2263a21a4', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SMD', 'Système de Mise à Disposition des données<br>Extraction de base SIV à des fin de vente des informations d’immatriculation sous licence. Par exemple AAA.<br><br>Ce module de SIV est hébergé au SIR à Rosny. Les bases sont répliquées de baie à baie (miroir) à partir des bases du SIV qui sont répliquées à Rosny.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '134a2297-56ed-4b41-9369-a1f576fafdd8'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'd271cd22-e8c1-48c8-ac8d-b968be8f50a9', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'IVG Infocentre SIV', '', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '24768663-0fd8-4bce-b010-8b38e2be305d'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '43f45013-9b67-4f66-a390-53019d44dd3f', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIV Gestion des Accès utilisateurs', 'SIV - Annuaire avec authentification et autorisation des utilisateurs<br>Annuaire LDAP et logiciel de contrôle d''accès développé par BULL. Gérant des authentifications et des habilitations des utilisateurs du SIV et du SIT (hors personnel PN et GN) et des certificats des partenaires.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '23379345-6f09-4ae9-806b-b7c86e37e749'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '09db362b-aa21-40a3-a0f6-0ee88b466f1d', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIV APD', 'SIV - Application des Pré-Demandes d’habilitation et d’agrément<br>Application de Pré-Demande d’habilitation et d’agrément des partenaires de l’immatriculation', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '8359e094-d961-4d57-9559-aa2b94e3daf8'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'f3c4b08c-af28-4cfc-9b79-41fe593ad92f', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIT', 'SIT (Système d’Information Télépaiement) est la plate-forme de télépaiement du SIV.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', '0a2905f2-7e62-47d2-81a9-4631ef3d944a'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'fd2be0e4-eec2-43ea-81c1-6871fb0ecffe', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'SIT Journalisation', 'Journalisation fonctionnelle du télépaiement SIT<br>Le module ’SIT Journalisation’ met en oeuvre une journalisation fonctionnelle pour le module SIT. Il utilise le même code que le module ’SIV Journalisation’ utilisé par SIV Coeur et SIV PPNG.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', 'cd26b13a-e6fb-49d4-a69e-c8fd25fdb0fa'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'f5c703da-eb36-4b94-81ef-eb868565de1a', NULL, 'HISTOVEC', 'HISTOVEC (historique des véhicules) est un nouveau composant du système d’information lié à l’immatriculation des véhicules (SIV). Il vise à sécuriser les ventes de véhicules d’occasion en permettant au vendeur de consulter les données d’historique de son véhicule et de les partager avec des acheteurs potentiels. HISTOVEC fournit des informations à valeur de certificat en amont de la transaction concernant un véhicule.', 'PRD', '98e14979-df97-44f6-a826-82f0912d633c', 'S3', 'SVBUS', 'ced601a0-3208-4cd4-b17e-a1cdc0b0fdeb'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ab4354c7-d73c-4ff9-a71d-e45dfda2929d', NULL, 'Portail titre', 'Le portail titre de l’ANTS permet aux usagers de réaliser des démarches en ligne concernant les titres dont l’ANTS est en charge : permis de conduire, certificat d’immatriculation du véhicule, CNI et passeport.', 'PRD', 'c79a571f-2ef0-4a7c-bffe-c3808a08a505', 'S3', 'SVBUS', 'd1674336-a32c-4c1f-b6a5-34a40a001b3d'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '023a79e9-b75f-4a38-9d0f-240979153e83', NULL, 'GED SID DEMATERIALISATION EN PREFECTURE', 'Système d’Information Documentaire,expérimentation gestion dématérialisée du cycle de vie des dossiers administratifs en Préfecture', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '77d0dd5f-3134-4bcf-870b-fce367aca388'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '23cbf1ed-0ea7-4096-83e7-c718ce354fe6', NULL, 'RNIPP', 'Répertoire national d’identification des personnes<br>Le RNIPP est un instrument de vérification de l’état civil des personnes nées en France. Sa consultation permet de préciser si une personne est en vie ou décédée et de connaître son numéro d’inscription au répertoire (NIR).', 'PRD', '8b418348-8030-4f4e-99bd-804181475a4a', 'S3', 'SVBUS', 'e95f4168-c940-4cbb-b8bc-0ce85d8609ec'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '7876cdf4-7c85-410a-92bd-b0a725500628', NULL, 'SIRENE', 'API SIRENE exposée par l’INSEE. API Sirene donne accès aux informations concernant les entreprises et les établissements immatriculés au répertoire interadministratif Sirene.', 'PRD', '8b418348-8030-4f4e-99bd-804181475a4a', 'S3', 'SVBUS', '11e651dc-22b4-4d92-a7bb-7eba9a4eb5a3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'fbf53c68-6080-445e-99a8-1745225a34c1', NULL, 'SID', 'Système d’Information Décisionnel traitant du fonctionnement du SIV.', 'PRD', 'c79a571f-2ef0-4a7c-bffe-c3808a08a505', 'S3', 'SVBUS', 'f548778c-92b3-4ce4-a35c-de7bfb4976df'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '60f5f60f-cad8-43ec-a095-40e0528cd4a2', NULL, 'EUCARIS', 'EUropean CAr and driving license Information System<br>Plateforme d’échange de données relatives aux immatriculations des véhicules avec les états membres de l’UE dans le cadre de l’accord de PRÜM. Autres appellations : PRÜM-SIV, PRÜM-IMMAT', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '1c5f66cc-3750-407e-8927-c62b00b39b4e'),('Tests Authentification Canel', '2023-12-20 11:24:56.502', 'Tests Authentification Canel', '2023-12-20 11:24:56.502', NULL, '2c47de8c-f2c2-493b-8e20-ffe0c3238491', NULL, 'AUTHTEST001-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '8f2f19a5-f412-415f-bcf3-f7dbc0c6f8aa'),('Tests Authentification Canel', '2023-12-20 11:24:56.526', 'Tests Authentification Canel', '2023-12-20 11:24:56.526', NULL, '8961e74b-4b07-4508-9aef-4506bd21d676', NULL, 'AUTHTEST002-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '2cc51290-0862-4626-84a3-934fd0910f73'),('Tests Authentification Canel', '2023-12-20 11:24:56.53', 'Tests Authentification Canel', '2023-12-20 11:24:56.53', NULL, '1ee2631d-ad26-4422-9b32-79dcfed883b4', NULL, 'AUTHTEST003-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', 'da069066-4318-499b-876a-20a482a4b538'),('Tests Authentification Canel', '2023-12-20 11:25:10.397', 'Tests Authentification Canel', '2023-12-20 11:25:10.397', NULL, '3955dc71-63bb-4ffd-b8d5-4b53158d1ffd', NULL, 'AUTHTEST001-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '6929f789-5d74-4be0-850f-434d1df9effe'),('Tests Authentification Canel', '2023-12-20 11:25:10.401', 'Tests Authentification Canel', '2023-12-20 11:25:10.401', NULL, '759f5b3c-b03f-423b-bae5-69a9065b5a16', NULL, 'AUTHTEST002-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', 'a33f6ecd-d546-4732-b7e5-8d3f0627565b'),('Tests Authentification Canel', '2023-12-20 11:25:10.405', 'Tests Authentification Canel', '2023-12-20 11:25:10.405', NULL, '76cede10-2e98-4607-93fe-9d3a6c2a7041', NULL, 'AUTHTEST003-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', 'ec5a6716-2e12-489b-8598-4fe987a3b6e9'),('Tests Authentification Canel', '2023-12-20 11:25:25.871', 'Tests Authentification Canel', '2023-12-20 11:25:25.871', NULL, 'd71e7870-3eb2-4cab-ac54-45602df8e148', NULL, 'AUTHTEST001-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '20a52ad5-8263-48e1-b07a-c6f52c5fd826'),('Tests Authentification Canel', '2023-12-20 11:25:25.875', 'Tests Authentification Canel', '2023-12-20 11:25:25.875', NULL, 'b9e53104-70e4-48ed-ae3d-51d2596b96d9', NULL, 'AUTHTEST002-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '952fc721-56f8-4b0c-96c4-a00db0495b07'),('Tests Authentification Canel', '2023-12-20 11:25:25.878', 'Tests Authentification Canel', '2023-12-20 11:25:25.878', NULL, '2f25b3ed-7799-4686-8f4d-120e7e9151f1', NULL, 'AUTHTEST003-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', 'c41cac8d-7a28-41a3-820a-62a752515454'),('Tests Authentification Canel', '2023-12-20 11:25:36.432', 'Tests Authentification Canel', '2023-12-20 11:25:36.432', NULL, '35a2df1c-c657-4177-bb92-bddc3b1e3b57', NULL, 'AUTHTEST001-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '67337805-dd43-4a8b-924a-137e3fa2df0c'),('Tests Authentification Canel', '2023-12-20 11:25:36.436', 'Tests Authentification Canel', '2023-12-20 11:25:36.436', NULL, 'e4810cc3-ee08-4ab9-a805-f7afb439d30b', NULL, 'AUTHTEST002-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '0afb35dd-3c9b-40bb-a84d-41d003fe7d3b'),('Tests Authentification Canel', '2023-12-20 11:25:36.439', 'Tests Authentification Canel', '2023-12-20 11:25:36.439', NULL, 'db3e6c9c-89d8-4008-8787-5d29b34170d8', NULL, 'AUTHTEST003-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '438a315e-0e97-447d-bc99-374c89ac72d1'),('Tests Authentification Canel', '2023-12-20 11:25:36.442', 'Tests Authentification Canel', '2023-12-20 11:25:36.442', NULL, '60a846fa-a71f-486f-9fe2-2f0e3008b1fe', NULL, 'AUTHTEST004-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '16c3a8a5-a967-44b6-a5f2-978a72bca847'),('Tests Authentification Canel', '2023-12-20 11:25:48.658', 'Tests Authentification Canel', '2023-12-20 11:25:48.658', NULL, '3b92b098-a897-4ba0-ac8b-6ced3719e17c', NULL, 'AUTHTEST001-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '26ed5913-af65-431e-b15e-d9529f33835c'),('Tests Authentification Canel', '2023-12-20 11:25:48.662', 'Tests Authentification Canel', '2023-12-20 11:25:48.662', NULL, '1a37144e-3599-4e96-9941-ba150e4146d5', NULL, 'AUTHTEST002-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '6943bba8-854e-452e-9c65-e2e4d0695a56'),('Tests Authentification Canel', '2023-12-20 11:25:48.665', 'Tests Authentification Canel', '2023-12-20 11:25:48.665', NULL, '59c76833-8d41-4883-a41c-e997e78685d6', NULL, 'AUTHTEST003-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '78b8872d-8995-44f7-a529-84ee8dc626b6'),('Tests Authentification Canel', '2023-12-20 11:25:48.668', 'Tests Authentification Canel', '2023-12-20 11:25:48.668', NULL, '2171e9e5-df14-4c41-b4f1-45d9487f1b09', NULL, 'AUTHTEST004-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '1589f534-ff3b-464e-b5a1-8cb90bbcc67c'),('Tests Authentification Canel', '2023-12-20 11:26:01.964', 'Tests Authentification Canel', '2023-12-20 11:26:01.964', NULL, 'ca4ce1e5-19f1-42ec-8f4c-d2597984d982', NULL, 'AUTHTEST001-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', 'bb539232-1292-405d-ad9d-fbab10b01218'),('Tests Authentification Canel', '2023-12-20 11:26:01.968', 'Tests Authentification Canel', '2023-12-20 11:26:01.968', NULL, '6562da35-b0cf-406c-890f-c26504264d53', NULL, 'AUTHTEST002-S1', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S1', 'SVBUS', '37c74303-a5be-40b1-bce8-f7899fabce7b'),('Tests Authentification Canel', '2023-12-20 11:26:01.971', 'Tests Authentification Canel', '2023-12-20 11:26:01.971', NULL, 'be8cdb9c-fa3a-4b30-b9ff-b1736df3cc1f', NULL, 'AUTHTEST003-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '3403e8aa-d1ca-44eb-b769-20d4aabe7112'),('Tests Authentification Canel', '2023-12-20 11:26:01.974', 'Tests Authentification Canel', '2023-12-20 11:26:01.974', NULL, 'd2c2e69c-efcf-4efb-aae2-6f8d5433e157', NULL, 'AUTHTEST004-S3', 'Fake SI for Authentification Tests of CANEL 2.1', 'PRD', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'S3', 'SVBUS', '9fd815a3-73ba-4f07-bd4e-84f0cc8a6d37')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_applicationid" IN SHARE MODE;
DELETE FROM "public"."app_applicationid";
INSERT INTO "public"."app_applicationid" ("createdby","createdat","updatedby","updatedat","comments","applicationid","applicationidtypecode","shortcode","longcode","id") VALUES ('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'CANL1', '9EDShgtkXHRK', NULL, '4a3fa9ed-d1a0-4689-9cfc-49a1c947414a'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '2a39cad5-0fc7-45b5-918d-a7702eba1154', 'PAI  ', 'SIV', NULL, '5946552c-2612-4e9b-9c98-1ca005f85d4b')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_compliance" IN SHARE MODE;
DELETE FROM "public"."app_compliance";
COMMIT;
BEGIN;
LOCK TABLE "public"."app_compliancetype" IN SHARE MODE;
DELETE FROM "public"."app_compliancetype";
INSERT INTO "public"."app_compliancetype" ("compliancetype","description","referenceurl") VALUES ('SSI  ', 'Homologation de sécurité', 'http://dnum.minint.fr/index.php/la-s-s-i/homologation/guide-homologation'),('RGAA ', 'Référentiel Général d''Accessibilité des Administrations', 'https://accessibilite.numerique.gouv.fr/'),('RGPD ', 'Réglement Général sur la Protection des Données', 'https://www.consilium.europa.eu/fr/policies/data-protection/data-protection-regulation/')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_flow" IN SHARE MODE;
DELETE FROM "public"."app_flow";
INSERT INTO "public"."app_flow" ("createdby","createdat","updatedby","updatedat","comments","flowid","applicationsourceid","organisationunitsourceid","applicationtargetid","organisationunittargetid","middleware","flowtypeid","flowprotocolid","flowperiodid","flowdataorientation","ports","id") VALUES ('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Dépôts pièces justificatives (CERT)', '5dcc1810-f4df-4aae-b6fd-40b61dd5703d', 'febeaf2d-20f7-4fb1-9d62-77234bf73fca', NULL, '7c12670e-eaeb-48c3-9918-68d519c58e19', NULL, NULL, NULL, 'TCP', 'PRD', 'push', NULL, '33ea7460-95d1-45bf-b374-2f234495b5a6'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Interrogation véhicule SIV', 'ca87940b-34f4-4581-b618-1d4ecf5aeccd', 'febeaf2d-20f7-4fb1-9d62-77234bf73fca', NULL, '60f5f60f-cad8-43ec-a095-40e0528cd4a2', NULL, NULL, NULL, 'TCP', 'PRD', 'push', NULL, '89fc4355-c317-410c-adc7-9120dec5970f'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Capture information CIV pour feuille index', 'bacc278b-cfe1-4163-bf48-e0825358f393', 'febeaf2d-20f7-4fb1-9d62-77234bf73fca', NULL, '023a79e9-b75f-4a38-9d0f-240979153e83', NULL, NULL, NULL, 'TCP', 'PRD', 'push', NULL, '9ee41b88-c532-4eb9-9db4-d6a7e5dab43b')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_flowdata" IN SHARE MODE;
DELETE FROM "public"."app_flowdata";
INSERT INTO "public"."app_flowdata" ("createdby","createdat","updatedby","updatedat","comments","flowid","dataid","datadescription","dataurl","id") VALUES ('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ca87940b-34f4-4581-b618-1d4ecf5aeccd', 'Caractéristiques véhicule terrestre', NULL, NULL, '688443fc-f646-4000-ab40-e3aeae8e67d9'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ca87940b-34f4-4581-b618-1d4ecf5aeccd', 'Numéro chassis', NULL, NULL, '61f23054-4fca-49dc-bfb8-2c7243c3d76a'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ca87940b-34f4-4581-b618-1d4ecf5aeccd', 'Numéro immatriculation', NULL, NULL, '908eef0f-b043-4fec-8700-7d05ea5678b3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ca87940b-34f4-4581-b618-1d4ecf5aeccd', 'Titulaire droit à circuler', NULL, NULL, 'eb5f43ed-e096-48c0-9c4d-83268949fb92')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_flowperiod" IN SHARE MODE;
DELETE FROM "public"."app_flowperiod";
INSERT INTO "public"."app_flowperiod" ("flowperiodid","label") VALUES ('PRD', 'Scheduled Transfer'),('RQT', 'On Request Transfer')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_flowprotocol" IN SHARE MODE;
DELETE FROM "public"."app_flowprotocol";
INSERT INTO "public"."app_flowprotocol" ("flowprotocolid","label") VALUES ('TCP', 'TCP'),('HTTP', 'HyperText Transport Protocol'),('HTTPS', 'HyperText Transport Protocol Secured')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_flowtype" IN SHARE MODE;
DELETE FROM "public"."app_flowtype";
INSERT INTO "public"."app_flowtype" ("flowtypeid","label") VALUES ('API-R', 'API REST'),('WBSVC', 'Web Service'),('FTP', 'File Transfer Protocol'),('SFTP', 'Secured File Transfer Protocol'),('ODBC', 'Object DataBase Connect'),('JDBC', 'Java DataBase Connect')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_idtype" IN SHARE MODE;
DELETE FROM "public"."app_idtype";
INSERT INTO "public"."app_idtype" ("applicationidtypecode","label") VALUES ('PAI   ', 'identifiant application MIOM'),('CANL1 ', 'identifiant Référentiel CANEL1')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_instance" IN SHARE MODE;
DELETE FROM "public"."app_instance";
COMMIT;
BEGIN;
LOCK TABLE "public"."app_instancerole" IN SHARE MODE;
DELETE FROM "public"."app_instancerole";
INSERT INTO "public"."app_instancerole" ("instancerole","label") VALUES ('C', 'Consultation'),('D', 'Développement'),('E', 'Production'),('F', 'Formation'),('I', 'Intégration'),('J', 'Formation Développement'),('K', 'Homologation'),('L', 'Livraison'),('M', 'Métrologie'),('P', 'Pré-production'),('Q', 'Qualification'),('R', 'Référentiel'),('S', 'Source'),('T', 'Qualification technique'),('V', 'Validation')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_instancestatus" IN SHARE MODE;
DELETE FROM "public"."app_instancestatus";
INSERT INTO "public"."app_instancestatus" ("instancestatus","label") VALUES ('CRS', 'Construction'),('PRD', 'Production'),('RSV', 'Retrait de service'),('DCS', 'Décommissionnée')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_interface" IN SHARE MODE;
DELETE FROM "public"."app_interface";
COMMIT;
BEGIN;
LOCK TABLE "public"."app_interfacetype" IN SHARE MODE;
DELETE FROM "public"."app_interfacetype";
INSERT INTO "public"."app_interfacetype" ("interfacetypeid","description") VALUES ('API-R', 'Application Programming Interface RESTfull'),('FILE ', 'Data provided through a file to be transfered')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_status" IN SHARE MODE;
DELETE FROM "public"."app_status";
INSERT INTO "public"."app_status" ("applicationstatuscode","label") VALUES ('BLD', 'En construction'),('PRD', 'En production'),('RTR', 'Retirée du service'),('DCS', 'Décommissionnée')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."app_type" IN SHARE MODE;
DELETE FROM "public"."app_type";
INSERT INTO "public"."app_type" ("applicationtypecode","label") VALUES ('WBEXT', 'Site de communication Internet'),('WBINT', 'Site de communication Intranet'),('SVBUS', 'Service métier'),('SVTRA', 'Service transverse'),('SVSCL', 'Service socle')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."env_environment" IN SHARE MODE;
DELETE FROM "public"."env_environment";
INSERT INTO "public"."env_environment" ("createdby","createdat","updatedby","updatedat","comments","environmentid","label","organisation","environmenttype","environmentprotection","environmentstatus","id") VALUES ('DSO', '2023-11-16 07:02:32.077', 'DSO', '2023-11-16 07:02:32.077', NULL, 'c62fff38-c86c-4f22-96e4-5bf718c58828', 'Cloud PI Native', '', 'CaaS', 'NP', 'Actif', '73c7151d-f938-4cbf-88f2-9b6082d03a0d')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."fct_capability" IN SHARE MODE;
DELETE FROM "public"."fct_capability";
INSERT INTO "public"."fct_capability" ("createdby","createdat","updatedby","updatedat","comments","capabilityid","parentid","label","description","id") VALUES ('Swagger', '2023-11-10 07:50:45.665', 'Swagger', '2023-11-10 07:50:45.665', NULL, '27383212-fcad-4b2d-b6a4-10ddd8ab62e8', NULL, 'string', 'string', '7bfacd27-e7af-41c9-a40f-de675dff2415')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."fct_capabilityrealisation" IN SHARE MODE;
DELETE FROM "public"."fct_capabilityrealisation";
COMMIT;
BEGIN;
LOCK TABLE "public"."fct_urbanzone" IN SHARE MODE;
DELETE FROM "public"."fct_urbanzone";
COMMIT;
BEGIN;
LOCK TABLE "public"."fct_urbanzoneapplication" IN SHARE MODE;
DELETE FROM "public"."fct_urbanzoneapplication";
COMMIT;
BEGIN;
LOCK TABLE "public"."fct_urbanzoneresponsability" IN SHARE MODE;
DELETE FROM "public"."fct_urbanzoneresponsability";
COMMIT;
BEGIN;
LOCK TABLE "public"."org_organisationunit" IN SHARE MODE;
DELETE FROM "public"."org_organisationunit";
INSERT INTO "public"."org_organisationunit" ("createdby","createdat","updatedby","updatedat","comments","organisationunitid","parentid","organisationcode","label","description","id") VALUES ('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', NULL, 'MI   ', 'Ministère de l''intérieur et des outre-mer', NULL, 'a9ae9884-e427-46a9-9e34-953a81f005a2'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '35f442b3-4aef-4edf-828f-594e04683eaf', NULL, 'MJ   ', 'Ministère de la justice', NULL, '1a4bda07-8eba-42d7-86ed-7510af4e9499'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'e1a5336a-5e2e-45b7-819c-5829d6743090', NULL, 'MA   ', 'Ministère des armées', NULL, 'e6da56e5-3bc9-4829-b983-8966d007fa5e'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'c5826ddf-9643-4e48-8477-5939852ed487', NULL, 'MAE  ', 'Ministère de l''Europe et des affaires étrangères', NULL, '456b415d-6eef-4b28-8ff0-6b3ca0f0be92'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '612429c4-120d-47f2-9b49-0bec44780a51', NULL, 'MEN  ', 'Ministère de l''éducation nationale', NULL, '7125b5d5-fb1c-4bf6-b923-077458f46be4'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '836a0b13-b650-4c47-b838-071cc718747e', NULL, 'MTE  ', 'Ministère de la transition écologique', NULL, 'f6d811ff-8f40-417c-a183-03933f62189b'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '92482f49-a590-40f1-8165-95d305b348dc', NULL, 'MEF  ', 'Ministère de l''économie et des finances', NULL, 'acbfbdad-49f5-45b5-8cff-ebe5456e69ea'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'e0bde8c4-727f-44e2-b773-6cf18d08a402', NULL, 'MC   ', 'Ministère de la Cuture', NULL, 'bb1066cd-964a-4136-acbb-02e56a0ff79c'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '077bf55e-c83d-4a4c-af60-aae52e372a6e', NULL, 'MT   ', 'Ministère du Travail', NULL, '421b8257-19f3-4955-bb70-25d9f8baa8a4'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '00a5aa96-8b78-44fc-a2c8-fa7f166c79a6', NULL, 'MAG  ', 'Ministère de l''Agriculture', NULL, 'fd7dc516-a76c-4f9c-acce-0d4a5c2fba85'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', 'edad59bf-e896-4900-bd9e-7be5d8e0e620', NULL, 'MS   ', 'Ministère de la Santé et de la Prévention', NULL, '78b6248a-542f-4167-9ca4-1405ec6d0705'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '2a97a3a0-c525-4226-b9d0-43f8e401292f', NULL, 'MES  ', 'Ministère de l''Enseignement supérieur et de la Recherche', NULL, 'b954b2df-4dd3-408d-bbef-dc0fe3291ea6'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '3f685298-45fa-42c5-8a60-d89084c31003', NULL, 'MSA  ', 'Ministère des Solidarités, de l''Autonomie et des Personnes handicapées', NULL, 'a4ab51eb-6365-495c-b6b9-f3840bbf222a'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '4470fd2a-7c26-458b-998d-ef15b908c305', NULL, 'MTFP ', 'Ministère de la Transformation et de la Fonction publiques', NULL, '946610ea-7b57-4013-99fd-6f57e842415b'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '36d1505f-541d-4ed5-8027-0bf9f7caba21', NULL, 'MSP  ', 'Ministère des Sports', NULL, 'd16068be-f388-4159-9f1e-67407b6c6a3e'),('Initialisation', '2023-10-24 09:34:39.462', 'Initialisation', '2023-10-24 09:34:39.462', 'Base ceation', '18b36a4f-33b5-4697-83af-30281eaaf8b1', NULL, 'PM   ', 'Premier Ministre', NULL, '7deed2f1-9631-4f15-9afe-ebced02cd374'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'c79a571f-2ef0-4a7c-bffe-c3808a08a505', NULL, 'ANTS ', 'Agence Nationale des Titres Sécurisés', NULL, '6aa1867f-728a-43a0-a26f-d8dc2ba2261b'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '98e14979-df97-44f6-a826-82f0912d633c', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'DSR  ', 'Direction de la Sécurité Routière', NULL, 'c87012ea-fdd8-474b-8a20-91cd4910d38b'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '8e7da1b6-1433-416f-912a-828daf32b855', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'DGCL ', 'Direction Générale des Collectivités Locales', NULL, '88810669-8e46-4c26-9071-5b8c3f9a1596'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ff1afcc9-ecab-4450-8ebc-1ac8df332dce', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'DGEF ', 'Direction Générale des Etranngers en France', NULL, 'f3fa8d9e-e60a-4166-89ab-f5275e3fa362'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '2b03710e-3f30-4881-a90f-ab00113bc563', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'DGGN ', 'Direction Générale de la Gendarmerie Nationale', NULL, '73b0bb88-8616-47db-943e-318e821ce3af'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '19e8f5a6-a723-4c8d-a9d9-56dae34f0941', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'DGPN ', 'Direction Générale de la Police Nationale', NULL, 'b9b4f22e-9e3b-4781-8a13-3e3bf91374c6'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ed1f60f2-3d67-4fcf-b820-c4938ce49c8d', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'DGSCG', 'Direction Générale de la Sécurité Civile et de la Gestion des Crises', NULL, '42cd05b1-57c8-4789-a5cb-f958f4bf338c'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '4d189727-c261-48c2-b10a-a5cb81f9665d', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'DGSI ', 'Direction Générale de la Sécurité Intérieure', NULL, 'ac758e06-793f-4d9c-af1e-96974ef39c5f'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '89478a23-7b6d-4bda-b6e2-090337b3c2ab', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'SGMI ', 'Secrétariat Général du Ministère de l''Intérieur et des Outre-Mers', NULL, '001e0efa-b2ef-486b-ac56-253520db8e25'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'e790b9ba-ff77-4359-9942-782469754084', '89478a23-7b6d-4bda-b6e2-090337b3c2ab', 'DTNUM', 'Direction de la Transformation Numérique', NULL, '1faadc79-58bf-4784-9ec1-c898d1e3c0ef'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'ab67f6e4-7142-4aed-bc6e-e32e54c5aae9', NULL, 'WLDNE', 'ex ATOS WorldLine', NULL, '5edebada-9948-4dde-82bb-69c24c26bc8d'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', '8b418348-8030-4f4e-99bd-804181475a4a', NULL, 'INSEE', 'Institut National de la Statistique et des Etudes Economiques', NULL, '29156e77-92fe-439a-9fc9-a708458753f3'),('YMLESAUX', '2023-10-24 09:34:53.278', 'YMLESAUX', '2023-10-24 09:34:53.278', 'Initialisation données 20231020', 'd346ba9a-12c8-4111-bba2-fe85c77a83ab', NULL, 'GLPST', 'Groupe La Poste', NULL, '1bc7a521-115e-48c4-88a1-719ee4ac759a'),('string', '2023-11-07 08:50:42.331', 'Swagger', '2023-11-07 08:50:42.331', NULL, '53b4df70-bf9a-43a8-a9a5-9fe7359fcd71', NULL, 'strin', 'aba', 'aba', 'b26ac473-4512-417e-9cd9-6331271c90f8'),('Testing', '2023-11-07 13:00:31.955', 'Testing', '2023-11-07 13:00:31.955', NULL, 'cc5b7538-b648-450e-8cf5-dc3ec5829f9e', NULL, 'SA   ', 'newlabel', 'newdescription', '03f66ea4-4570-4f3e-acfe-74bae8d8b26a'),('Testing', '2023-11-07 13:00:31.961', 'Testing', '2023-11-07 13:00:31.961', NULL, '056faf09-5fca-4d4b-9a73-8841b914656d', NULL, 'SA   ', 'newlabel', 'newdescription', '44e4bc1b-6ab6-43e6-8c52-d2127585bfb2'),('Swagger', '2023-11-07 13:00:32.106', 'Swagger', '2023-11-07 13:00:32.106', NULL, '045781c3-372b-4218-a1d7-98043af76797', NULL, 'MA   ', 'newlabel', 'description', 'fe36eba8-a288-42f3-b0ec-70e45871e14b'),('Testing', '2023-11-07 13:00:32.135', 'Swagger', '2023-11-07 13:00:32.135', NULL, '55e6b4fa-bb8e-4e95-a8e9-221812a159f6', NULL, 'MA   ', 'newlabel', 'description', '0eea0011-d93a-450f-b561-b2241bec5924'),('Testing', '2023-11-07 13:16:47.415', 'Testing', '2023-11-07 13:16:47.415', NULL, 'f457a0ad-d155-466b-b3be-4f9a85544034', NULL, 'SA   ', 'newlabel', 'newdescription', '4eb7e05e-9ce5-4efc-93bf-3bf69583840c'),('Testing', '2023-11-07 13:16:47.42', 'Testing', '2023-11-07 13:16:47.42', NULL, 'ba22928f-1527-4fca-b8a0-7d4f0e73fdb7', NULL, 'SA   ', 'newlabel', 'newdescription', 'd2d86a63-ab2a-4517-9a72-904b2ae8b2b5'),('Swagger', '2023-11-07 13:16:48.288', 'Swagger', '2023-11-07 13:16:48.288', NULL, 'c8deccca-e503-449c-a92d-699784cfd7fb', NULL, 'MA   ', 'newlabel', 'description', '6ca09a50-ddf2-4201-bb3d-144121b67743'),('Testing', '2023-11-07 13:16:48.311', 'Swagger', '2023-11-07 13:16:48.311', NULL, '5aa47611-c244-4e12-b49b-39d7c9c71e22', NULL, 'MA   ', 'newlabel', 'description', 'd2eca294-d3dc-409b-abf5-33ddf5a28ebd'),('Swagger', '2023-11-07 13:18:05.669', 'Swagger', '2023-11-07 13:18:05.669', NULL, 'e97e73d4-c819-4c2c-9af7-0568eabe4a48', NULL, 'MA   ', 'newlabel', 'description', '6116fca7-9b77-4cf2-a9da-4bfcbde4c2c3'),('Testing', '2023-11-07 13:18:05.697', 'Swagger', '2023-11-07 13:18:05.697', NULL, 'f79384af-5230-448f-8b98-8f8a2689c428', NULL, 'MA   ', 'newlabel', 'description', '18df86a9-d2c9-4314-9e0d-f36793ef4452'),('Testing', '2023-11-07 13:18:06.549', 'Testing', '2023-11-07 13:18:06.549', NULL, 'bcb7e915-686b-4ef7-b8c5-bf764a9cf26f', NULL, 'SA   ', 'newlabel', 'newdescription', 'cd2323ed-3cec-422d-afb3-000a4ba5168e'),('Testing', '2023-11-07 13:18:06.554', 'Testing', '2023-11-07 13:18:06.554', NULL, 'b96f4508-27c1-4c67-bcc7-a2475f9bef10', NULL, 'SA   ', 'newlabel', 'newdescription', 'de3ad76a-5502-4f98-8b86-d95a639053fd'),('Swagger', '2023-11-14 08:15:16.206', 'Swagger', '2023-11-14 08:15:16.206', NULL, 'b407a4d1-c6a0-4d5e-a5fb-7da57b5cde0e', NULL, 'strin', 'string', 'string', 'e932671f-441d-420c-bca2-5ea71ce6341b'),('DSO', '2023-11-14 08:33:55.841', 'DSO', '2023-11-14 08:33:55.841', NULL, '2d379c27-f8c9-45aa-9aca-dc039dd73bd0', NULL, 'strin', 'string', 'string', '972d9d51-a1ce-4c02-89ca-1fd845b8d848'),('Swagger', '2023-11-14 10:38:05.273', 'Swagger', '2023-11-14 10:38:05.273', NULL, 'a2d183df-35be-410d-a698-6e4d3eb46086', NULL, 'MA   ', 'newlabel', 'description', '4c6a026f-c077-4595-92f1-15e1eae81f3a'),('Testing', '2023-11-14 10:38:05.297', 'Swagger', '2023-11-14 10:38:05.297', NULL, 'ba5dcf84-31c2-47cb-baa6-4aa6cead6e8f', NULL, 'MA   ', 'newlabel', 'description', '07ebde3e-3ed0-4605-b9ef-0ef5f4cd8ded'),('Testing', '2023-11-14 10:38:05.412', 'Testing', '2023-11-14 10:38:05.412', NULL, 'ae4eb43c-2cf6-4fbf-a1e0-c5a762f7722d', NULL, 'SA   ', 'newlabel', 'newdescription', '01a970f7-0076-44e2-a151-a4214d0c939b'),('Testing', '2023-11-14 10:38:05.425', 'Testing', '2023-11-14 10:38:05.425', NULL, '39090ad3-d5a4-4b5a-9446-027ded9f9bb8', NULL, 'SA   ', 'newlabel', 'newdescription', '20e8ce1d-530a-4b87-8715-592f26f4da44'),('Testing', '2023-11-14 10:41:19.489', 'Testing', '2023-11-14 10:41:19.489', NULL, '91a4d72d-1daa-44c7-966e-ecd137599115', NULL, 'SA   ', 'newlabel', 'newdescription', '58dd317d-7ac8-416d-bff2-df8350ff343a'),('Testing', '2023-11-14 10:41:19.496', 'Testing', '2023-11-14 10:41:19.496', NULL, 'e40df3cb-3f6a-4d6d-af09-7710f31280ed', NULL, 'SA   ', 'newlabel', 'newdescription', '8600a935-8765-402a-9431-d403e82ed66b'),('Swagger', '2023-11-14 10:41:19.824', 'Swagger', '2023-11-14 10:41:19.824', NULL, '6bf4a12f-04c9-49c9-99b6-d6bfeede80dc', NULL, 'MA   ', 'newlabel', 'description', '675014e1-0245-47e1-a8a1-aae85cb06856'),('Testing', '2023-11-14 10:41:19.857', 'Swagger', '2023-11-14 10:41:19.857', NULL, 'f263efc0-61ba-43a5-9b92-c7d62fc54be8', NULL, 'MA   ', 'newlabel', 'description', '1cbbba73-fdc8-4f75-b75b-6c171ee18c4d')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."org_roletype" IN SHARE MODE;
DELETE FROM "public"."org_roletype";
INSERT INTO "public"."org_roletype" ("roleid","label") VALUES ('CDP  ', 'Chef de Projet/Product Owner'),('MOA  ', 'MOA/Business Owner'),('ASOL ', 'Architecte Solution'),('AINF ', 'Architecte Infra'),('MOE  ', 'MOE'),('RPP  ', 'Resp Production'),('SUPT ', 'Support'),('RSSI ', 'RSSI'),('SOUSC', 'Souscripteur'),('DSO  ', 'DSO Console'),('PUB  ', 'Public'),('DIR  ', 'Director')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."prj_applicationrole" IN SHARE MODE;
DELETE FROM "public"."prj_applicationrole";
INSERT INTO "public"."prj_applicationrole" ("createdby","createdat","updatedby","updatedat","comments","applicationid","actorid","organisationunitid","roleid","validationdate","id") VALUES ('Reprise Data 20231130', '2023-12-20 11:25:36.45', 'Reprise Data 20231130', '2023-12-20 11:25:36.45', NULL, '60a846fa-a71f-486f-9fe2-2f0e3008b1fe', '94323248-8e64-44ff-9977-fa090ca95a22', 'c9909000-9e0a-4f12-8d5c-3a22c9d3947e', 'CDP  ', '2025-01-23', '684fb6b2-6a1f-4d58-bbe9-2550775581f9')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."prj_project" IN SHARE MODE;
DELETE FROM "public"."prj_project";
COMMIT;
BEGIN;
LOCK TABLE "public"."prj_projectapplication" IN SHARE MODE;
DELETE FROM "public"."prj_projectapplication";
COMMIT;
BEGIN;
LOCK TABLE "public"."prj_projectresponsability" IN SHARE MODE;
DELETE FROM "public"."prj_projectresponsability";
COMMIT;
BEGIN;
LOCK TABLE "public"."ptf_portfolio" IN SHARE MODE;
DELETE FROM "public"."ptf_portfolio";
COMMIT;
BEGIN;
LOCK TABLE "public"."ptf_portfolioapplication" IN SHARE MODE;
DELETE FROM "public"."ptf_portfolioapplication";
COMMIT;
BEGIN;
LOCK TABLE "public"."ptf_portfolioresponsability" IN SHARE MODE;
DELETE FROM "public"."ptf_portfolioresponsability";
COMMIT;
BEGIN;
LOCK TABLE "public"."ref_sensitivity" IN SHARE MODE;
DELETE FROM "public"."ref_sensitivity";
INSERT INTO "public"."ref_sensitivity" ("sensitivitycode","label") VALUES ('S1', 'Standard'),('S2', 'Sensible'),('S3', 'Essentiel'),('S4', 'Importance vitale')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."resources" IN SHARE MODE;
DELETE FROM "public"."resources";
INSERT INTO "public"."resources" ("id","resource") VALUES (1, 'Actor'),(2, 'Role'),(3, 'Application'),(4, 'Compliance'),(5, 'Environment'),(6, 'Instance'),(7, 'ReferenceData')
;
COMMIT;
BEGIN;
LOCK TABLE "public"."roles" IN SHARE MODE;
DELETE FROM "public"."roles";
INSERT INTO "public"."roles" ("roleid","resourceid","create_all","create_own","read_all","read_own","update_all","update_own","delete_all","delete_own") VALUES ('CDP  ', 1, 't', 't', 't', 't', 't', 't', 'f', 'f'),('CDP  ', 2, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('CDP  ', 3, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('CDP  ', 4, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('CDP  ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('CDP  ', 6, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('CDP  ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('MOA  ', 1, 't', 't', 't', 't', 't', 't', 'f', 'f'),('MOA  ', 2, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('MOA  ', 3, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('MOA  ', 4, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('MOA  ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('MOA  ', 6, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('MOA  ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('ASOL ', 1, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('ASOL ', 2, 'f', 't', 'f', 't', 'f', 'f', 'f', 'f'),('ASOL ', 3, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('ASOL ', 4, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('ASOL ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('ASOL ', 6, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('ASOL ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('AINF ', 1, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('AINF ', 2, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('AINF ', 3, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('AINF ', 4, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('AINF ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('AINF ', 6, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('AINF ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('MOE  ', 1, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('MOE  ', 2, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('MOE  ', 3, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('MOE  ', 4, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('MOE  ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('MOE  ', 6, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('MOE  ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('RPP  ', 1, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('RPP  ', 2, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('RPP  ', 3, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('RPP  ', 4, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('RPP  ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('RPP  ', 6, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('RPP  ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('SUPT ', 1, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('SUPT ', 2, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('SUPT ', 3, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('SUPT ', 4, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('SUPT ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('SUPT ', 6, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('SUPT ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('RSSI ', 1, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('RSSI ', 2, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('RSSI ', 3, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('RSSI ', 4, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('RSSI ', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('RSSI ', 6, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('RSSI ', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('SOUSC', 1, 't', 't', 't', 't', 't', 't', 'f', 'f'),('SOUSC', 2, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('SOUSC', 3, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('SOUSC', 4, 'f', 'f', 'f', 't', 'f', 'f', 'f', 'f'),('SOUSC', 5, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f'),('SOUSC', 6, 'f', 't', 'f', 't', 'f', 't', 'f', 'f'),('SOUSC', 7, 'f', 'f', 't', 't', 'f', 'f', 'f', 'f')
;
COMMIT;
ALTER TABLE "abs_tracability" ADD CONSTRAINT "abs_tracability_pk" PRIMARY KEY ("id");
ALTER TABLE "act_actor" ADD CONSTRAINT "act_actor_pkey" PRIMARY KEY ("actorid");
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_pk" PRIMARY KEY ("actorid", "actorcode");
ALTER TABLE "act_actorcodetype" ADD CONSTRAINT "act_actorcodetype_pkey" PRIMARY KEY ("actorcodetype");
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_pkey" PRIMARY KEY ("applicationid");
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_pk" PRIMARY KEY ("shortcode", "applicationidtypecode", "applicationid");
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_pk" PRIMARY KEY ("applicationid", "compliancetype");
ALTER TABLE "app_compliancetype" ADD CONSTRAINT "app_compliancetype_pkey" PRIMARY KEY ("compliancetype");
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_pkey" PRIMARY KEY ("flowid");
ALTER TABLE "app_flowdata" ADD CONSTRAINT "app_flowdata_pk" PRIMARY KEY ("flowid", "dataid");
ALTER TABLE "app_flowperiod" ADD CONSTRAINT "app_flowperiod_pkey" PRIMARY KEY ("flowperiodid");
ALTER TABLE "app_flowprotocol" ADD CONSTRAINT "app_flowprotocol_pkey" PRIMARY KEY ("flowprotocolid");
ALTER TABLE "app_flowtype" ADD CONSTRAINT "app_flowtype_pkey" PRIMARY KEY ("flowtypeid");
ALTER TABLE "app_idtype" ADD CONSTRAINT "app_idtype_pkey" PRIMARY KEY ("applicationidtypecode");
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_pk" PRIMARY KEY ("id");
ALTER TABLE "app_instancerole" ADD CONSTRAINT "app_instancerole_pkey" PRIMARY KEY ("instancerole");
ALTER TABLE "app_instancestatus" ADD CONSTRAINT "app_instancestatus_pkey" PRIMARY KEY ("instancestatus");
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_pk" PRIMARY KEY ("interfaceid");
ALTER TABLE "app_interfacetype" ADD CONSTRAINT "app_interfacetype_pkey" PRIMARY KEY ("interfacetypeid");
ALTER TABLE "app_status" ADD CONSTRAINT "app_status_pkey" PRIMARY KEY ("applicationstatuscode");
ALTER TABLE "app_type" ADD CONSTRAINT "app_type_pkey" PRIMARY KEY ("applicationtypecode");
ALTER TABLE "env_environment" ADD CONSTRAINT "env_environment_pkey" PRIMARY KEY ("environmentid");
ALTER TABLE "fct_capability" ADD CONSTRAINT "fct_capability_pkey" PRIMARY KEY ("capabilityid");
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_pk" PRIMARY KEY ("applicationid", "capabilityid");
ALTER TABLE "fct_urbanzone" ADD CONSTRAINT "fct_urbanzone_pkey" PRIMARY KEY ("urbanzoneid");
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_pk" PRIMARY KEY ("urbanzoneid", "applicationid");
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_pk" PRIMARY KEY ("urbanzoneid", "organisationunitid", "roleid");
ALTER TABLE "org_organisationunit" ADD CONSTRAINT "org_organisationunit_pkey" PRIMARY KEY ("organisationunitid");
ALTER TABLE "org_roletype" ADD CONSTRAINT "org_roletype_pkey" PRIMARY KEY ("roleid");
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_pk" PRIMARY KEY ("applicationid", "roleid", "organisationunitid");
ALTER TABLE "prj_project" ADD CONSTRAINT "prj_project_pkey" PRIMARY KEY ("projectid");
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_pk" PRIMARY KEY ("projectid", "applicationid", "applicationrole");
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_pk" PRIMARY KEY ("roleid", "organisationunitid", "actorid", "projectid");
ALTER TABLE "ptf_portfolio" ADD CONSTRAINT "ptf_portfolio_pkey" PRIMARY KEY ("portfolioid");
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_pk" PRIMARY KEY ("portfolioid", "applicationid");
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_pk" PRIMARY KEY ("portfolioid", "actorid", "organisationunitid", "roleid");
ALTER TABLE "ref_sensitivity" ADD CONSTRAINT "ref_sensitivity_pkey" PRIMARY KEY ("sensitivitycode");
ALTER TABLE "resources" ADD CONSTRAINT "newtable_pk" PRIMARY KEY ("id");
ALTER TABLE "roles" ADD CONSTRAINT "roles_pk" PRIMARY KEY ("roleid", "resourceid");
ALTER TABLE "act_actor" ADD CONSTRAINT "email" UNIQUE ("email");
ALTER TABLE "act_actor" ADD CONSTRAINT "act_actor_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_actorcodetype_fkey" FOREIGN KEY ("actorcodetype") REFERENCES "public"."act_actorcodetype" ("actorcodetype") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "act_actorcode" ADD CONSTRAINT "act_actorcode_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_apptype_fkey" FOREIGN KEY ("apptype") REFERENCES "public"."app_type" ("applicationtypecode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_sensitivity_fkey" FOREIGN KEY ("sensitivity") REFERENCES "public"."ref_sensitivity" ("sensitivitycode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_application" ADD CONSTRAINT "app_application_status_fkey" FOREIGN KEY ("status") REFERENCES "public"."app_status" ("applicationstatuscode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_applicationid" ADD CONSTRAINT "app_applicationid_applicationidtypecode_fkey" FOREIGN KEY ("applicationidtypecode") REFERENCES "public"."app_idtype" ("applicationidtypecode") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_compliance" ADD CONSTRAINT "app_compliance_compliancetype_fkey" FOREIGN KEY ("compliancetype") REFERENCES "public"."app_compliancetype" ("compliancetype") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_applicationsourceid_fkey" FOREIGN KEY ("applicationsourceid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_applicationtargetid_fkey" FOREIGN KEY ("applicationtargetid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowperiodid_fkey" FOREIGN KEY ("flowperiodid") REFERENCES "public"."app_flowperiod" ("flowperiodid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowprotocolid_fkey" FOREIGN KEY ("flowprotocolid") REFERENCES "public"."app_flowprotocol" ("flowprotocolid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_flowtypeid_fkey" FOREIGN KEY ("flowtypeid") REFERENCES "public"."app_flowtype" ("flowtypeid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_organisationunitsourceid_fkey" FOREIGN KEY ("organisationunitsourceid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flow" ADD CONSTRAINT "app_flow_organisationunittargetid_fkey" FOREIGN KEY ("organisationunittargetid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_flowdata" ADD CONSTRAINT "app_flowdata_flowid_fkey" FOREIGN KEY ("flowid") REFERENCES "public"."app_flow" ("flowid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_environmentid_fkey" FOREIGN KEY ("environmentid") REFERENCES "public"."env_environment" ("environmentid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_instancerole_fkey" FOREIGN KEY ("instancerole") REFERENCES "public"."app_instancerole" ("instancerole") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_instance" ADD CONSTRAINT "app_instance_instancestatus_fkey" FOREIGN KEY ("instancestatus") REFERENCES "public"."app_instancestatus" ("instancestatus") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_applicationdatasource_fkey" FOREIGN KEY ("applicationdatasource") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_applicationdistribution_fkey" FOREIGN KEY ("applicationdistribution") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "app_interface" ADD CONSTRAINT "app_interface_interfacetypeid_fkey" FOREIGN KEY ("interfacetypeid") REFERENCES "public"."app_interfacetype" ("interfacetypeid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_capability" ADD CONSTRAINT "fct_capability_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."fct_capability" ("capabilityid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_capabilityrealisation" ADD CONSTRAINT "fct_capabilityrealisation_capabilityid_fkey" FOREIGN KEY ("capabilityid") REFERENCES "public"."fct_capability" ("capabilityid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzone" ADD CONSTRAINT "fct_urbanzone_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."fct_urbanzone" ("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneapplication" ADD CONSTRAINT "fct_urbanzoneapplication_urbanzoneid_fkey" FOREIGN KEY ("urbanzoneid") REFERENCES "public"."fct_urbanzone" ("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "fct_urbanzoneresponsability" ADD CONSTRAINT "fct_urbanzoneresponsability_urbanzoneid_fkey" FOREIGN KEY ("urbanzoneid") REFERENCES "public"."fct_urbanzone" ("urbanzoneid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "org_organisationunit" ADD CONSTRAINT "org_organisationunit_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_applicationrole" ADD CONSTRAINT "prj_applicationrole_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_project" ADD CONSTRAINT "prj_project_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."prj_project" ("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectapplication" ADD CONSTRAINT "prj_projectapplication_projectid_fkey" FOREIGN KEY ("projectid") REFERENCES "public"."prj_project" ("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_projectid_fkey" FOREIGN KEY ("projectid") REFERENCES "public"."prj_project" ("projectid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "prj_projectresponsability" ADD CONSTRAINT "prj_projectresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolio" ADD CONSTRAINT "ptf_portfolio_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."ptf_portfolio" ("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_applicationid_fkey" FOREIGN KEY ("applicationid") REFERENCES "public"."app_application" ("applicationid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioapplication" ADD CONSTRAINT "ptf_portfolioapplication_portfolioid_fkey" FOREIGN KEY ("portfolioid") REFERENCES "public"."ptf_portfolio" ("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_actorid_fkey" FOREIGN KEY ("actorid") REFERENCES "public"."act_actor" ("actorid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_organisationunitid_fkey" FOREIGN KEY ("organisationunitid") REFERENCES "public"."org_organisationunit" ("organisationunitid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_portfolioid_fkey" FOREIGN KEY ("portfolioid") REFERENCES "public"."ptf_portfolio" ("portfolioid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ptf_portfolioresponsability" ADD CONSTRAINT "ptf_portfolioresponsability_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "resources" ADD CONSTRAINT "newtable_un" UNIQUE ("resource");
ALTER TABLE "roles" ADD CONSTRAINT "roles_fk" FOREIGN KEY ("roleid") REFERENCES "public"."org_roletype" ("roleid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_fk_1" FOREIGN KEY ("resourceid") REFERENCES "public"."resources" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER SEQUENCE "newtable_id_seq"
OWNED BY "resources"."id";
SELECT setval('"newtable_id_seq"', 7, true);
ALTER SEQUENCE "newtable_id_seq" OWNER TO "postgres";
